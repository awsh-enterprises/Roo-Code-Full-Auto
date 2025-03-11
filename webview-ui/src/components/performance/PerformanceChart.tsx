import React from "react"

interface PerformanceChartProps {
	data: Array<{
		timestamp: number
		duration: number
		tokensIn: number
		tokensOut: number
		provider: string
		modelId: string
		cost: number
	}>
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => {
	// Sort data by timestamp
	const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp)

	// Find max values for scaling
	const maxDuration = Math.max(...sortedData.map((item) => item.duration), 1)

	// Calculate chart dimensions
	const chartHeight = 200
	const barWidth = 20
	const gap = 10
	const chartWidth = (barWidth + gap) * sortedData.length

	return (
		<div className="performance-chart">
			<div style={{ position: "relative", height: `${chartHeight + 50}px`, width: "100%", overflowX: "auto" }}>
				<svg width={Math.max(chartWidth, 300)} height={chartHeight + 50} style={{ minWidth: "100%" }}>
					{/* Y-axis */}
					<line
						x1="40"
						y1="10"
						x2="40"
						y2={chartHeight + 10}
						stroke="var(--vscode-foreground)"
						strokeWidth="1"
						opacity="0.5"
					/>

					{/* X-axis */}
					<line
						x1="40"
						y1={chartHeight + 10}
						x2={chartWidth + 40}
						y2={chartHeight + 10}
						stroke="var(--vscode-foreground)"
						strokeWidth="1"
						opacity="0.5"
					/>

					{/* Y-axis labels */}
					<text x="10" y="20" fill="var(--vscode-foreground)" fontSize="12">
						{maxDuration}ms
					</text>
					<text x="10" y={chartHeight / 2 + 10} fill="var(--vscode-foreground)" fontSize="12">
						{Math.round(maxDuration / 2)}ms
					</text>
					<text x="10" y={chartHeight + 10} fill="var(--vscode-foreground)" fontSize="12">
						0ms
					</text>

					{/* Bars */}
					{sortedData.map((item, index) => {
						const barHeight = (item.duration / maxDuration) * chartHeight
						const x = index * (barWidth + gap) + 50
						const y = chartHeight - barHeight + 10

						return (
							<g key={index}>
								<rect
									x={x}
									y={y}
									width={barWidth}
									height={barHeight}
									fill="var(--vscode-button-background)"
									opacity="0.8">
									<title>
										{`${new Date(item.timestamp).toLocaleString()}
Duration: ${item.duration}ms
Provider: ${item.provider}
Model: ${item.modelId}
Tokens In: ${item.tokensIn}
Tokens Out: ${item.tokensOut}
Cost: $${item.cost.toFixed(4)}`}
									</title>
								</rect>

								{/* X-axis labels (only show every 5th for readability) */}
								{index % 5 === 0 && (
									<text
										x={x + barWidth / 2}
										y={chartHeight + 30}
										fill="var(--vscode-foreground)"
										fontSize="10"
										textAnchor="middle"
										transform={`rotate(45, ${x + barWidth / 2}, ${chartHeight + 30})`}>
										{new Date(item.timestamp).toLocaleTimeString()}
									</text>
								)}
							</g>
						)
					})}
				</svg>
			</div>

			<div
				className="chart-legend"
				style={{ marginTop: "20px", display: "flex", justifyContent: "center", gap: "20px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
					<div
						style={{
							width: "12px",
							height: "12px",
							backgroundColor: "var(--vscode-button-background)",
							opacity: 0.8,
						}}></div>
					<span>Request Duration (ms)</span>
				</div>
			</div>
		</div>
	)
}

export default PerformanceChart
