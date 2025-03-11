import React from "react"

interface ProviderComparisonChartProps {
	data: Array<{
		provider: string
		requestCount: number
		totalDuration: number
		totalTokensIn: number
		totalTokensOut: number
		totalCost: number
	}>
}

const ProviderComparisonChart: React.FC<ProviderComparisonChartProps> = ({ data }) => {
	if (data.length === 0) {
		return <div>No provider data available</div>
	}

	// Calculate average duration per request for each provider
	const providersWithAvg = data.map((item) => ({
		...item,
		avgDuration: item.totalDuration / item.requestCount,
	}))

	// Sort by average duration
	const sortedData = [...providersWithAvg].sort((a, b) => a.avgDuration - b.avgDuration)

	// Find max values for scaling
	const maxAvgDuration = Math.max(...sortedData.map((item) => item.avgDuration), 1)

	// Calculate chart dimensions
	const chartHeight = 200
	const barWidth = 40
	const gap = 20
	const topPadding = 30 // Added padding for labels at the top
	const chartWidth = Math.max((barWidth + gap) * sortedData.length, 300)

	// Generate colors for providers
	const getProviderColor = (index: number) => {
		const colors = [
			"var(--vscode-charts-blue)",
			"var(--vscode-charts-red)",
			"var(--vscode-charts-yellow)",
			"var(--vscode-charts-orange)",
			"var(--vscode-charts-green)",
			"var(--vscode-charts-purple)",
		]
		return colors[index % colors.length]
	}

	return (
		<div className="provider-comparison-chart">
			<div
				style={{
					position: "relative",
					height: `${chartHeight + 70 + topPadding}px`,
					width: "100%",
					overflowX: "auto",
				}}>
				<svg width={chartWidth} height={chartHeight + 70 + topPadding} style={{ minWidth: "100%" }}>
					{/* Y-axis */}
					<line
						x1="60"
						y1={topPadding}
						x2="60"
						y2={chartHeight + topPadding}
						stroke="var(--vscode-foreground)"
						strokeWidth="1"
						opacity="0.5"
					/>

					{/* X-axis */}
					<line
						x1="60"
						y1={chartHeight + topPadding}
						x2={chartWidth + 10}
						y2={chartHeight + topPadding}
						stroke="var(--vscode-foreground)"
						strokeWidth="1"
						opacity="0.5"
					/>

					{/* Y-axis labels */}
					<text x="10" y={topPadding + 5} fill="var(--vscode-foreground)" fontSize="12">
						{Math.round(maxAvgDuration)}ms
					</text>
					<text x="10" y={chartHeight / 2 + topPadding} fill="var(--vscode-foreground)" fontSize="12">
						{Math.round(maxAvgDuration / 2)}ms
					</text>
					<text x="10" y={chartHeight + topPadding} fill="var(--vscode-foreground)" fontSize="12">
						0ms
					</text>

					{/* Bars */}
					{sortedData.map((item, index) => {
						const barHeight = (item.avgDuration / maxAvgDuration) * chartHeight
						const x = index * (barWidth + gap) + 70
						const y = chartHeight - barHeight + topPadding
						const color = getProviderColor(index)

						return (
							<g key={index}>
								<rect x={x} y={y} width={barWidth} height={barHeight} fill={color} opacity="0.8">
									<title>
										{`Provider: ${item.provider}
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
									y={chartHeight + topPadding + 20}
									fill="var(--vscode-foreground)"
									fontSize="12"
									textAnchor="middle">
									{item.provider}
								</text>

								{/* Value labels */}
								<text
									x={x + barWidth / 2}
									y={y - 10}
									fill="var(--vscode-foreground)"
									fontSize="12"
									textAnchor="middle">
									{Math.round(item.avgDuration)}ms
								</text>
							</g>
						)
					})}

					{/* Chart title */}
					<text
						x={chartWidth / 2}
						y={chartHeight + topPadding + 50}
						fill="var(--vscode-foreground)"
						fontSize="14"
						textAnchor="middle"
						fontWeight="bold">
						Average Request Duration by Provider (ms)
					</text>
				</svg>
			</div>
		</div>
	)
}

export default ProviderComparisonChart
