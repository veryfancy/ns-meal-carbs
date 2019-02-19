const _ = require("lodash");
const percentile = require("percentile");

const whereNotZero = collection => (_.filter(collection, x => x !== 0));

module.exports = collection => {
	const filtered = whereNotZero(collection);
	const avg = (filtered.length > 0) ? (_.sum(filtered) / filtered.length) : 0;
	const min = (filtered.length > 0) ? _.min(filtered) : 0;
	const max = (filtered.length > 0) ? _.max(filtered) : 0;
	const pct10 = (filtered.length > 0) ? percentile(10, filtered) : 0;
	const pct20 = (filtered.length > 0) ? percentile(20, filtered) : 0;
	const pct50 = (filtered.length > 0) ? percentile(50, filtered) : 0;
	const pct90 = (filtered.length > 0) ? percentile(90, filtered) : 0;

	return {
		avg,
		min,
		max,
		pct10,
		pct20,
		pct50,
		pct90
	};
};