import { OpenAiHandler, OpenAiHandlerOptions } from "./openai"
import { deepSeekModels, deepSeekDefaultModelId, ModelInfo } from "../../shared/api"
import { ApiStream, ApiStreamUsageChunk } from "../transform/stream"
import { getModelParams } from "../index"
import axios from "axios"

// DeepSeek API status endpoint
const DEEPSEEK_STATUS_URL = "https://status.deepseek.com/api/v2/status.json"

// DeepSeek error codes and messages
const DEEPSEEK_ERROR_CODES: Record<string, string> = {
	invalid_api_key: "Invalid API key provided",
	insufficient_quota: "Insufficient quota to complete the request",
	rate_limit_exceeded: "Rate limit exceeded, please try again later",
	model_not_found: "The requested model was not found",
	context_length_exceeded: "Input exceeds maximum context length",
	invalid_request: "Invalid request parameters",
	internal_server_error: "Internal server error",
	service_unavailable: "Service temporarily unavailable",
}

// DeepSeek API options interface
export interface DeepSeekOptions extends OpenAiHandlerOptions {
	deepSeekJsonMode?: boolean
	deepSeekEnableKvCache?: boolean
	deepSeekEnableFunctionCalling?: boolean
	deepSeekForceFunctionCalling?: boolean
}

export class DeepSeekHandler extends OpenAiHandler {
	private apiStatus: { operational: boolean; message?: string } = { operational: true }
	private lastStatusCheck: number = 0
	private statusCheckInterval: number = 5 * 60 * 1000 // 5 minutes

	constructor(options: DeepSeekOptions) {
		super({
			...options,
			openAiApiKey: options.deepSeekApiKey ?? "not-provided",
			openAiModelId: options.deepSeekModelId ?? options.apiModelId ?? deepSeekDefaultModelId,
			openAiBaseUrl: options.deepSeekBaseUrl ?? "https://api.deepseek.com",
			openAiStreamingEnabled: true,
			includeMaxTokens: true,
			openAiCustomModelInfo: options.deepSeekCustomModelInfo,
		})

		// Check API status on initialization
		this.checkApiStatus()
	}

	// Check DeepSeek API status
	private async checkApiStatus(): Promise<void> {
		const now = Date.now()
		// Only check status if it's been more than the interval since last check
		if (now - this.lastStatusCheck < this.statusCheckInterval) {
			return
		}

		try {
			const response = await axios.get(DEEPSEEK_STATUS_URL)
			const status = response.data

			// Update status based on response
			this.apiStatus = {
				operational: status.status.indicator === "none",
				message: status.status.description,
			}

			this.lastStatusCheck = now
		} catch (error) {
			// If we can't reach the status page, assume operational but log the error
			console.error("Failed to check DeepSeek API status:", error)
			this.apiStatus = { operational: true }
		}
	}

	override getModel(): { id: string; info: ModelInfo } {
		const modelId = this.options.deepSeekModelId ?? this.options.apiModelId ?? deepSeekDefaultModelId
		let info: ModelInfo

		if (this.options.deepSeekCustomModelInfo) {
			info = this.options.deepSeekCustomModelInfo
		} else {
			info = deepSeekModels[modelId as keyof typeof deepSeekModels] || deepSeekModels[deepSeekDefaultModelId]
		}

		return {
			id: modelId,
			info,
			...getModelParams({ options: this.options, model: info }),
		}
	}

	// We'll use the parent OpenAiHandler's createMessage method but add DeepSeek-specific options
	override async completePrompt(prompt: string): Promise<string> {
		// Check API status before making a request
		await this.checkApiStatus()

		// Add warning about API status to the response if needed
		let statusWarning = ""
		if (!this.apiStatus.operational) {
			statusWarning = `⚠️ DeepSeek API may be experiencing issues: ${this.apiStatus.message || "Unknown status issue"}. `
		}

		try {
			const result = await super.completePrompt(prompt)
			return statusWarning + result
		} catch (error: any) {
			// Handle DeepSeek specific errors
			const errorMessage = this.formatDeepSeekError(error)
			throw new Error(statusWarning + errorMessage)
		}
	}

	// Format DeepSeek errors with more helpful messages
	private formatDeepSeekError(error: any): string {
		if (!error) return "Unknown error occurred"

		// Extract error code from DeepSeek API response
		let errorCode = ""
		let errorMessage = error.message || "Unknown error"

		if (error.response?.data?.error?.code) {
			errorCode = error.response.data.error.code
		} else if (error.response?.data?.error?.type) {
			errorCode = error.response.data.error.type
		}

		// Use our predefined error messages if available
		if (errorCode && DEEPSEEK_ERROR_CODES[errorCode]) {
			errorMessage = DEEPSEEK_ERROR_CODES[errorCode]

			// Add API status information if relevant
			if (
				!this.apiStatus.operational &&
				(errorCode === "service_unavailable" || errorCode === "internal_server_error")
			) {
				errorMessage += ` (DeepSeek API Status: ${this.apiStatus.message || "Issues reported"})`
			}
		}

		return `DeepSeek API Error: ${errorMessage}`
	}

	// Override to handle DeepSeek's usage metrics, including caching.
	protected override processUsageMetrics(usage: any): ApiStreamUsageChunk {
		return {
			type: "usage",
			inputTokens: usage?.prompt_tokens || 0,
			outputTokens: usage?.completion_tokens || 0,
			cacheWriteTokens: usage?.prompt_tokens_details?.cache_miss_tokens,
			cacheReadTokens: usage?.prompt_tokens_details?.cached_tokens,
		}
	}
}
