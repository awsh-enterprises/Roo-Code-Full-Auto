import React from "react"

interface ModelComparisonChartProps {
	data: Array<{
		modelId: string
		requestCount: number
		totalDuration: number
		totalTokensIn: number
		totalTokensOut: number
		totalCost: number
	}>
}

const ModelComparisonChart: React.FC<ModelComparisonChartProps> = ({ data }) => {
	if (data.length === 0) {
		return <div>No model data available</div>
	}

	// Calculate average duration per request for each model
	const modelsWithAvg = data.map((item) => ({
		...item,
		avgDuration: item.totalDuration / item.requestCount,
		tokensPerSecond: item.totalTokensOut / (item.totalDuration / 1000), // tokens per second
	}))

	// Sort by tokens per second (higher is better)
	const sortedData = [...modelsWithAvg].sort((a, b) => b.tokensPerSecond - a.tokensPerSecond)

	// Find max values for scaling
	const maxTokensPerSecond = Math.max(...sortedData.map((item) => item.tokensPerSecond), 1)

	// Calculate chart dimensions
	const chartHeight = 200
	const barWidth = 40
	const gap = 20
	const chartWidth = Math.max((barWidth + gap) * sortedData.length, 300)

	// Generate colors for models
	const getModelColor = (index: number) => {
		const colors = [
			"var(--vscode-charts-green)",
			"var(--vscode-charts-blue)",
			"var(--vscode-charts-purple)",
			"var(--vscode-charts-red)",
			"var(--vscode-charts-yellow)",
			"var(--vscode-charts-orange)",
		]
		return colors[index % colors.length]
	}

	return (
		<div className="model-comparison-chart">
			<div style={{ position: "relative", height: `${chartHeight + 90}px`, width: "100%", overflowX: "auto" }}>
				<svg width={chartWidth} height={chartHeight + 90} style={{ minWidth: "100%" }}>
					{/* Y-axis */}
					<line
						x1="60"
						y1="10"
						x2="60"
						y2={chartHeight + 10}
						stroke="var(--vscode-foreground)"
						strokeWidth="1"
						opacity="0.5"
					/>

					{/* X-axis */}
					<line
						x1="60"
						y1={chartHeight + 10}
						x2={chartWidth + 10}
						y2={chartHeight + 10}
						stroke="var(--vscode-foreground)"
						strokeWidth="1"
						opacity="0.5"
					/>

					{/* Y-axis labels */}
					<text x="10" y="20" fill="var(--vscode-foreground)" fontSize="12">
						{Math.round(maxTokensPerSecond)}
					</text>
					<text x="10" y={chartHeight / 2 + 10} fill="var(--vscode-foreground)" fontSize="12">
						{Math.round(maxTokensPerSecond / 2)}
					</text>
					<text x="10" y={chartHeight + 10} fill="var(--vscode-foreground)" fontSize="12">
						0
					</text>

					{/* Bars */}
					{sortedData.map((item, index) => {
						const barHeight = (item.tokensPerSecond / maxTokensPerSecond) * chartHeight
						const x = index * (barWidth + gap) + 70
						const y = chartHeight - barHeight + 10
						const color = getModelColor(index)

						return (
							<g key={index}>
								<rect x={x} y={y} width={barWidth} height={barHeight} fill={color} opacity="0.8">
									<title>
										{`Model: ${item.modelId}
Tokens/Second: ${Math.round(item.tokensPerSecond)}
Average Duration: ${Math.round(item.avgDuration)}ms
Total Requests: ${item.requestCount}
Total Tokens In: ${item.totalTokensIn}
Total Tokens Out: ${item.totalTokensOut}
Total Cost: $${item.totalCost.toFixed(4)}`}
									</title>
								</rect>

								{/* X-axis labels */}
								<text
									x={x + barWidth / 2}
									y={chartHeight + 30}
									fill="var(--vscode-foreground)"
									fontSize="12"
									textAnchor="middle"
									transform={`rotate(45, ${x + barWidth / 2}, ${chartHeight + 30})`}>
									{item.modelId}
								</text>

								{/* Value labels */}
								<text
									x={x + barWidth / 2}
									y={y - 5}
									fill="var(--vscode-foreground)"
									fontSize="12"
									textAnchor="middle">
									{Math.round(item.tokensPerSecond)}
								</text>
							</g>
						)
					})}

					{/* Chart title */}
					<text
						x={chartWidth / 2}
						y={chartHeight + 70}
						fill="var(--vscode-foreground)"
						fontSize="14"
						textAnchor="middle"
						fontWeight="bold">
						Output Tokens per Second by Model
					</text>
				</svg>
			</div>

			<div
				className="chart-note"
				style={{
					textAlign: "center",
					marginTop: "10px",
					fontSize: "12px",
					color: "var(--vscode-descriptionForeground)",
				}}>
				Higher values indicate faster token generation
			</div>
		</div>
	)
}

export default ModelComparisonChart
