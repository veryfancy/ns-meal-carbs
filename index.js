const https = require("https");
const moment = require("moment");
const _ = require("lodash");

const startDate = moment("2018-05-03");
const endDate = moment("2018-07-03");
const URL = "https://ns-cjs.herokuapp.com/api/v1/treatments?find[eventType]=Meal%20Bolus";

const buildUrl = () => {
	let parts = [];
	parts.push("find[created_at][$gte]="+moment(startDate).add(-1, "days").format("YYYY-MM-DD"));
	parts.push("find[created_at][$lte]="+moment(endDate).add(2, "days").format("YYYY-MM-DD"));
	
	const url = "https://ns-cjs.herokuapp.com/api/v1/treatments?" + parts.join("&");
	console.log("url", url);
	return url;
};

https.get(buildUrl(), res => {
	let data = '';
	console.log("statusCode:", res.statusCode);
	console.log("headers", res.headers);

	res.on("data", chunk => {
		data += chunk;
	});

	res.on("end", () => {
		displayMealData(data);
	});

}).on('error', e => {
	console.error(e);
});

const formatEntryType = entry => (entry.eventType);
const formatEntryCarbs = entry => ((entry.carbs || 0) + "g");
const formatEntryInsulin = entry => ((entry.insulin || 0) + " units");
const formatEntryTime = entry => (entry.created_at.format("dddd, MMMM Do YYYY, h:mm:ss a"));

const printEntry = entry => {
	console.log(
		formatEntryType(entry) +
		": " +
		formatEntryInsulin(entry) +
		" for " +
		formatEntryCarbs(entry) +
		" at " +
		formatEntryTime(entry)
	);
};

const displayMealData = mealData => {
	console.log("mealData:", mealData);
	const entries = JSON.parse(mealData);
	const momented = _.map(entries, x => {
		return Object.assign({}, x, {
			created_at: moment(x.created_at)
		});
	});
	const filtered = _.filter(
		momented,
		x => {
			return x.created_at.isBetween(startDate, endDate, 'days', '[]')
				&& ["Meal Bolus", "Combo Bolus", "Snack Bolus"].indexOf(x.eventType) >= 0
		}
	);
	const sorted = _.sortBy(filtered, [x => (new Date(x.created_at))]);

	console.log(`\nFound ${sorted.length} entries between ${startDate.format("MMMM Do YYYY")} and ${endDate.format("MMMM Do YYYY")}: \n`);

	_.each(sorted, entry => {
		printEntry(entry);
	});

	const printEntries = col => _.each(col, printEntry);

	// breakfast
	// console.log("Breakfast (between 7 and 11)")
	// const breakfast = _.filter(sorted, x => (x.created_at.hour() >= 7 && x.created_at.hour() <= 11));
	// _.each(breakfast, entry => {
	// 	printEntry(entry);
	// });

	const betweenHours = (x, start, end) => (x.created_at.hour() >= start && x.created_at.hour() <= end);
	const findEntriesBetweenHours = (collection, start, end) => (
		_.filter(
			collection,
			x => (betweenHours(x, start, end))
		)
	);

	const breakfastStart = 7;
	const breakfastEnd = 11;
	const findBreakfasts = collection => (findEntriesBetweenHours(collection, breakfastStart, breakfastEnd));

	const lunchStart = 11;
	const lunchEnd = 15;
	const findLunches = collection => (findEntriesBetweenHours(collection, lunchStart, lunchEnd));
	
	const dinnerStart = 17;
	const dinnerEnd = 21;
	const findDinners = collection => (findEntriesBetweenHours(collection, dinnerStart, dinnerEnd));
	
	const formatDecimal = x => parseFloat(Math.round(x * 100) / 100).toFixed(2);
	const carbSum = col => (_.reduce(col, (sum, n) => (sum + n.carbs), 0));
	const insulinSum = col => (_.reduce(col, (sum, n) => (sum + n.insulin), 0));

	const formatMealSummary = (meal, insulin, carbs) => {
		return `${meal}: ${carbs} g`;
	};

	let breakfastCarbsByDay = [];
	let lunchCarbsByDay = [];
	let dinnerCarbsByDay = [];
	for(let date = moment(startDate); date.isSameOrBefore(endDate); date.add(1, "days")) {
		console.log(date.format("MMMM Do YYYY:"));
		const dateEntries = _.filter(sorted, x => x.created_at.isSame(date, "day"))

		const breakfastEntries = findBreakfasts(dateEntries);
		const breakfastCarbs = carbSum(breakfastEntries)
		breakfastCarbsByDay.push(breakfastCarbs);
		console.log(formatMealSummary("Breakfast", insulinSum(breakfastEntries), breakfastCarbs));

		const lunchEntries = findLunches(dateEntries);
		const lunchCarbs = carbSum(lunchEntries)
		lunchCarbsByDay.push(lunchCarbs);
		console.log(formatMealSummary("Lunch", insulinSum(lunchEntries), carbSum(lunchEntries)));
		
		const dinnerEntries = findDinners(dateEntries);
		const dinnerCarbs = carbSum(dinnerEntries)
		dinnerCarbsByDay.push(dinnerCarbs);
		console.log(formatMealSummary("Dinner", insulinSum(dinnerEntries), carbSum(dinnerEntries)));
	}

	const whereNotZero = collection => (_.filter(collection, x => x !== 0));
	const getMealStats = collection => {
		const filtered = whereNotZero(collection);
		const avg = (filtered.length > 0) ? (_.sum(filtered) / filtered.length) : 0;
		const min = (filtered.length > 0) ? _.min(filtered) : 0;
		const max = (filtered.length > 0) ? _.max(filtered) : 0;
		return {
			avg,
			min,
			max
		};
	};
	const formatMealStats = (meal, stats) => (`${meal}:\n  Average: ${formatDecimal(stats.avg)} g\n  Min: ${stats.min} g\n  Max: ${stats.max} g`);

	console.log("\nSTATS");
	console.log(formatMealStats("Breakfast", getMealStats(breakfastCarbsByDay)));
	console.log(formatMealStats("Lunch", getMealStats(lunchCarbsByDay)));
	console.log(formatMealStats("Dinner", getMealStats(dinnerCarbsByDay)));
	
	// console.log(`Breakfast: ${avgWhereNotZero(breakfastCarbsByDay)} g`);
	// console.log(`Lunch: ${avgWhereNotZero(lunchCarbsByDay)} g`);
	// console.log(`Dinner: ${avgWhereNotZero(dinnerCarbsByDay)} g`);
};

// { _id: '5b357978ef60f927bc4db19f',
// enteredBy: 'Alicia',
// eventType: 'Meal Bolus',
// glucose: 90,
// reason: '',
// glucoseType: 'Finger',
// carbs: 15,
// insulin: 0.75,
// duration: 0,
// units: 'mg/dl',
// created_at: '2018-06-29T00:12:40.422Z' }

