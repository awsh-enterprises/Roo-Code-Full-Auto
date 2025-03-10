import { ClineMessage } from "./ExtensionMessage"

interface ApiMetrics {
	totalTokensIn: number
	totalTokensOut: number
	totalCacheWrites?: number
	totalCacheReads?: number
	totalCost: number
	contextTokens: number // Total tokens in conversation (last message's tokensIn + tokensOut + cacheWrites + cacheReads)
	totalDuration?: number // Total duration of all API requests in milliseconds
	requestCount?: number // Total number of API requests
	averageDuration?: number // Average duration per request in milliseconds
	requestsByProvider?: Record<string, number> // Count of requests by provider
	requestsByModel?: Record<string, number> // Count of requests by model
	durationByProvider?: Record<string, number> // Total duration by provider
	durationByModel?: Record<string, number> // Total duration by model
	performanceHistory?: Array<{
		ts: number
		duration: number
		tokensIn?: number
		tokensOut?: number
		provider?: string
		modelId?: string
	}>
}

/**
 * Calculates API metrics from an array of ClineMessages.
 *
 * This function processes 'api_req_started' messages that have been combined with their
 * corresponding 'api_req_finished' messages by the combineApiRequests function.
 * It extracts and sums up the tokensIn, tokensOut, cacheWrites, cacheReads, and cost from these messages.
 *
 * @param messages - An array of ClineMessage objects to process.
 * @returns An ApiMetrics object containing totalTokensIn, totalTokensOut, totalCacheWrites, totalCacheReads, totalCost, and contextTokens.
 *
 * @example
 * const messages = [
 *   { type: "say", say: "api_req_started", text: '{"request":"GET /api/data","tokensIn":10,"tokensOut":20,"cost":0.005}', ts: 1000 }
 * ];
 * const { totalTokensIn, totalTokensOut, totalCost } = getApiMetrics(messages);
 * // Result: { totalTokensIn: 10, totalTokensOut: 20, totalCost: 0.005 }
 */
export function getApiMetrics(messages: ClineMessage[]): ApiMetrics {
	const result: ApiMetrics = {
		totalTokensIn: 0,
		totalTokensOut: 0,
		totalCacheWrites: undefined,
		totalCacheReads: undefined,
		totalCost: 0,
		contextTokens: 0,
		totalDuration: 0,
		requestCount: 0,
		averageDuration: 0,
		requestsByProvider: {},
		requestsByModel: {},
		durationByProvider: {},
		durationByModel: {},
		performanceHistory: [],
	}

	// Helper function to get total tokens from a message
	const getTotalTokensFromMessage = (message: ClineMessage): number => {
		if (!message.text) return 0
		try {
			const { tokensIn, tokensOut, cacheWrites, cacheReads } = JSON.parse(message.text)
			return (tokensIn || 0) + (tokensOut || 0) + (cacheWrites || 0) + (cacheReads || 0)
		} catch {
			return 0
		}
	}

	// Find the last api_req_started message that has any tokens
	const lastApiReq = [...messages].reverse().find((message) => {
		if (message.type === "say" && message.say === "api_req_started") {
			return getTotalTokensFromMessage(message) > 0
		}
		return false
	})

	// Calculate running totals
	messages.forEach((message) => {
		if (message.type === "say" && message.say === "api_req_started" && message.text) {
			try {
				const {
					tokensIn,
					tokensOut,
					cacheWrites,
					cacheReads,
					cost,
					startTime,
					endTime,
					duration,
					provider,
					modelId,
				} = JSON.parse(message.text)

				if (typeof tokensIn === "number") {
					result.totalTokensIn += tokensIn
				}
				if (typeof tokensOut === "number") {
					result.totalTokensOut += tokensOut
				}
				if (typeof cacheWrites === "number") {
					result.totalCacheWrites = (result.totalCacheWrites ?? 0) + cacheWrites
				}
				if (typeof cacheReads === "number") {
					result.totalCacheReads = (result.totalCacheReads ?? 0) + cacheReads
				}
				if (typeof cost === "number") {
					result.totalCost += cost
				}

				// Track performance metrics
				result.requestCount! += 1

				// Calculate duration either from provided duration or from start/end times
				let requestDuration = 0
				if (typeof duration === "number") {
					requestDuration = duration
				} else if (typeof startTime === "number" && typeof endTime === "number") {
					requestDuration = endTime - startTime
				}

				if (requestDuration > 0) {
					result.totalDuration! += requestDuration

					// Add to performance history
					result.performanceHistory!.push({
						ts: message.ts,
						duration: requestDuration,
						tokensIn,
						tokensOut,
						provider,
						modelId,
					})

					// Track by provider
					if (provider) {
						result.requestsByProvider![provider] = (result.requestsByProvider![provider] || 0) + 1
						result.durationByProvider![provider] =
							(result.durationByProvider![provider] || 0) + requestDuration
					}

					// Track by model
					if (modelId) {
						result.requestsByModel![modelId] = (result.requestsByModel![modelId] || 0) + 1
						result.durationByModel![modelId] = (result.durationByModel![modelId] || 0) + requestDuration
					}
				}

				// If this is the last api request with tokens, use its total for context size
				if (message === lastApiReq) {
					result.contextTokens = getTotalTokensFromMessage(message)
				}
			} catch (error) {
				console.error("Error parsing JSON:", error)
			}
		}
	})

	// Calculate average duration
	if (result.requestCount! > 0 && result.totalDuration! > 0) {
		result.averageDuration = result.totalDuration! / result.requestCount!
	}

	return result
}
