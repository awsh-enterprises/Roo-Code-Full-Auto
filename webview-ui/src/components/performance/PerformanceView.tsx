import {
	VSCodeButton,
	VSCodeDivider,
	VSCodePanels,
	VSCodePanelTab,
	VSCodePanelView,
} from "@vscode/webview-ui-toolkit/react"
import { useState, useEffect } from "react"
import { useExtensionState } from "../../context/ExtensionStateContext"
import PerformanceChart from "./PerformanceChart"
import ProviderComparisonChart from "./ProviderComparisonChart"
import ModelComparisonChart from "./ModelComparisonChart"

type PerformanceViewProps = {
	onDone: () => void
}

const PerformanceView = ({ onDone }: PerformanceViewProps) => {
	const { clineMessages } = useExtensionState()
	const [performanceData, setPerformanceData] = useState<any[]>([])
	const [providerData, setProviderData] = useState<any[]>([])
	const [modelData, setModelData] = useState<any[]>([])

	useEffect(() => {
		// Extract performance data from clineMessages
		const apiRequests = clineMessages.filter((msg) => msg.say === "api_req_started" && msg.text)

		interface PerformanceData {
			timestamp: number
			duration: number
			tokensIn: number
			tokensOut: number
			provider: string
			modelId: string
			cost: number
		}

		const extractedData = apiRequests
			.map((msg) => {
				try {
					const data = JSON.parse(msg.text || "{}")
					return {
						timestamp: msg.ts,
						duration: data.duration || 0,
						tokensIn: data.tokensIn || 0,
						tokensOut: data.tokensOut || 0,
						provider: data.provider || "unknown",
						modelId: data.modelId || "unknown",
						cost: data.cost || 0,
					} as PerformanceData
				} catch (e) {
					return null
				}
			})
			.filter((item): item is PerformanceData => item !== null)

		setPerformanceData(extractedData)

		// Aggregate data by provider
		const providerStats = extractedData.reduce<Record<string, any>>((acc, item) => {
			if (item && item.provider) {
				if (!acc[item.provider]) {
					acc[item.provider] = {
						provider: item.provider,
						requestCount: 0,
						totalDuration: 0,
						totalTokensIn: 0,
						totalTokensOut: 0,
						totalCost: 0,
					}
				}

				acc[item.provider].requestCount += 1
				acc[item.provider].totalDuration += item.duration || 0
				acc[item.provider].totalTokensIn += item.tokensIn || 0
				acc[item.provider].totalTokensOut += item.tokensOut || 0
				acc[item.provider].totalCost += item.cost || 0
			}

			return acc
		}, {})

		setProviderData(Object.values(providerStats))

		// Aggregate data by model
		const modelStats = extractedData.reduce<Record<string, any>>((acc, item) => {
			if (item && item.modelId) {
				if (!acc[item.modelId]) {
					acc[item.modelId] = {
						modelId: item.modelId,
						requestCount: 0,
						totalDuration: 0,
						totalTokensIn: 0,
						totalTokensOut: 0,
						totalCost: 0,
					}
				}

				acc[item.modelId].requestCount += 1
				acc[item.modelId].totalDuration += item.duration || 0
				acc[item.modelId].totalTokensIn += item.tokensIn || 0
				acc[item.modelId].totalTokensOut += item.tokensOut || 0
				acc[item.modelId].totalCost += item.cost || 0
			}

			return acc
		}, {})

		setModelData(Object.values(modelStats))
	}, [clineMessages])

	return (
		<div className="fixed inset-0 flex flex-col">
			<div className="flex justify-between items-center px-5 py-2.5 border-b border-vscode-panel-border">
				<h3 className="text-vscode-foreground m-0">Performance Metrics</h3>
				<VSCodeButton onClick={onDone}>Done</VSCodeButton>
			</div>
			<div className="flex-1 overflow-auto p-5">
				<div
					style={{
						color: "var(--vscode-foreground)",
						fontSize: "13px",
						marginBottom: "20px",
					}}>
					Monitor and analyze the performance of your LLM API requests. This data helps you compare different
					providers and models to optimize your workflow.
				</div>

				{performanceData.length === 0 ? (
					<div className="flex items-center justify-center h-64">
						<p className="text-vscode-descriptionForeground">
							No performance data available yet. Make some API requests to see metrics.
						</p>
					</div>
				) : (
					<VSCodePanels style={{ marginBottom: "20px" }}>
						<VSCodePanelTab id="history">Request History</VSCodePanelTab>
						<VSCodePanelTab id="providers">Provider Comparison</VSCodePanelTab>
						<VSCodePanelTab id="models">Model Comparison</VSCodePanelTab>

						<VSCodePanelView id="history-view">
							<div className="p-4">
								<h4 className="mb-4">API Request Performance History</h4>
								<PerformanceChart data={performanceData} />

								<VSCodeDivider style={{ margin: "20px 0" }} />

								<div className="mt-4">
									<h4 className="mb-2">Request Details</h4>
									<div className="overflow-x-auto">
										<table className="w-full" style={{ borderCollapse: "collapse" }}>
											<thead>
												<tr>
													<th className="text-left p-2 border-b border-vscode-panel-border">
														Timestamp
													</th>
													<th className="text-left p-2 border-b border-vscode-panel-border">
														Duration (ms)
													</th>
													<th className="text-left p-2 border-b border-vscode-panel-border">
														Provider
													</th>
													<th className="text-left p-2 border-b border-vscode-panel-border">
														Model
													</th>
													<th className="text-left p-2 border-b border-vscode-panel-border">
														Tokens In
													</th>
													<th className="text-left p-2 border-b border-vscode-panel-border">
														Tokens Out
													</th>
													<th className="text-left p-2 border-b border-vscode-panel-border">
														Cost
													</th>
												</tr>
											</thead>
											<tbody>
												{performanceData
													.slice()
													.reverse()
													.map((item, index) => (
														<tr
															key={index}
															className="hover:bg-vscode-list-hoverBackground">
															<td className="p-2 border-b border-vscode-panel-border">
																{new Date(item.timestamp).toLocaleString()}
															</td>
															<td className="p-2 border-b border-vscode-panel-border">
																{item.duration}
															</td>
															<td className="p-2 border-b border-vscode-panel-border">
																{item.provider}
															</td>
															<td className="p-2 border-b border-vscode-panel-border">
																{item.modelId}
															</td>
															<td className="p-2 border-b border-vscode-panel-border">
																{item.tokensIn}
															</td>
															<td className="p-2 border-b border-vscode-panel-border">
																{item.tokensOut}
															</td>
															<td className="p-2 border-b border-vscode-panel-border">
																${item.cost.toFixed(4)}
															</td>
														</tr>
													))}
											</tbody>
										</table>
									</div>
								</div>
							</div>
						</VSCodePanelView>

						<VSCodePanelView id="providers-view">
							<div className="p-4">
								<h4 className="mb-4">Provider Performance Comparison</h4>
								<ProviderComparisonChart data={providerData} />

								<VSCodeDivider style={{ margin: "20px 0" }} />

								<div className="mt-4">
									<h4 className="mb-2">Provider Statistics</h4>
									<div className="overflow-x-auto">
										<table className="w-full" style={{ borderCollapse: "collapse" }}>
											<thead>
												<tr>
													<th className="text-left p-2 border-b border-vscode-panel-border">
														Provider
													</th>
													<th className="text-left p-2 border-b border-vscode-panel-border">
														Requests
													</th>
													<th className="text-left p-2 border-b border-vscode-panel-border">
														Avg Duration (ms)
													</th>
													<th className="text-left p-2 border-b border-vscode-panel-border">
														Total Tokens In
													</th>
													<th className="text-left p-2 border-b border-vscode-panel-border">
														Total Tokens Out
													</th>
													<th className="text-left p-2 border-b border-vscode-panel-border">
														Total Cost
													</th>
												</tr>
											</thead>
											<tbody>
												{providerData.map((item, index) => (
													<tr key={index} className="hover:bg-vscode-list-hoverBackground">
														<td className="p-2 border-b border-vscode-panel-border">
															{item.provider}
														</td>
														<td className="p-2 border-b border-vscode-panel-border">
															{item.requestCount}
														</td>
														<td className="p-2 border-b border-vscode-panel-border">
															{(item.totalDuration / item.requestCount).toFixed(0)}
														</td>
														<td className="p-2 border-b border-vscode-panel-border">
															{item.totalTokensIn}
														</td>
														<td className="p-2 border-b border-vscode-panel-border">
															{item.totalTokensOut}
														</td>
														<td className="p-2 border-b border-vscode-panel-border">
															${item.totalCost.toFixed(4)}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>
							</div>
						</VSCodePanelView>

						<VSCodePanelView id="models-view">
							<div className="p-4">
								<h4 className="mb-4">Model Performance Comparison</h4>
								<ModelComparisonChart data={modelData} />

								<VSCodeDivider style={{ margin: "20px 0" }} />

								<div className="mt-4">
									<h4 className="mb-2">Model Statistics</h4>
									<div className="overflow-x-auto">
										<table className="w-full" style={{ borderCollapse: "collapse" }}>
											<thead>
												<tr>
													<th className="text-left p-2 border-b border-vscode-panel-border">
														Model
													</th>
													<th className="text-left p-2 border-b border-vscode-panel-border">
														Requests
													</th>
													<th className="text-left p-2 border-b border-vscode-panel-border">
														Avg Duration (ms)
													</th>
													<th className="text-left p-2 border-b border-vscode-panel-border">
														Total Tokens In
													</th>
													<th className="text-left p-2 border-b border-vscode-panel-border">
														Total Tokens Out
													</th>
													<th className="text-left p-2 border-b border-vscode-panel-border">
														Total Cost
													</th>
												</tr>
											</thead>
											<tbody>
												{modelData.map((item, index) => (
													<tr key={index} className="hover:bg-vscode-list-hoverBackground">
														<td className="p-2 border-b border-vscode-panel-border">
															{item.modelId}
														</td>
														<td className="p-2 border-b border-vscode-panel-border">
															{item.requestCount}
														</td>
														<td className="p-2 border-b border-vscode-panel-border">
															{(item.totalDuration / item.requestCount).toFixed(0)}
														</td>
														<td className="p-2 border-b border-vscode-panel-border">
															{item.totalTokensIn}
														</td>
														<td className="p-2 border-b border-vscode-panel-border">
															{item.totalTokensOut}
														</td>
														<td className="p-2 border-b border-vscode-panel-border">
															${item.totalCost.toFixed(4)}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>
							</div>
						</VSCodePanelView>
					</VSCodePanels>
				)}
			</div>
		</div>
	)
}

export default PerformanceView
