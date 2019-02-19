const formatDecimal = x => parseFloat(Math.round(x * 100) / 100).toFixed(2);

module.exports = (meal, stats) => {
	return `${meal}:\n` +
		`  Average: ${formatDecimal(stats.avg)} g\n` +
		`  Min: ${stats.min} g\n` +
		`  Max: ${stats.max} g\n` +
		`  Median: ${stats.pct50} g\n` +
		`  10th Percentile: ${stats.pct10} g\n` +
		`  20th Percentile: ${stats.pct20} g\n` +
		`  90th Percentile: ${stats.pct90} g`;
};
