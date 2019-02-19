const https = require("https");
const moment = require("moment");
const calculateMealStats = require("./calculateMealStats");
const formatMealStats = require("./formatMealStats");
const _ = require("lodash");
const inquirer = require("inquirer");

inquirer.prompt([
	{
		type: "input",
		name: "siteUrl",
		message: "What is your nightscout site's base URL?",
		default: () => ("https://mysite.herokuapp.com/")
	},
	{
		type: "input",
		name: "startDate",
		message: "What start date would you like to use for meal analysis?",
		default: () => (moment(new Date()).add(-1, 'months').format('l'))
	},
	{
		type: "input",
		name: "endDate",
		message: "What end date would you like to use?",
		default: () => (moment(new Date()).format('l'))
	}
]).then(answers => {
	const baseUrl = answers.siteUrl;
	const startDate = moment(answers.startDate, 'l');
	const endDate = moment(answers.endDate, 'l');

	makeItDo(baseUrl, startDate, endDate);
});

const makeItDo = (baseUrl, startDate, endDate) => {
	const buildUrl = baseUrl => {
		let parts = [];
		parts.push("find[created_at][$gte]="+moment(startDate).add(-1, "days").format("YYYY-MM-DD"));
		parts.push("find[created_at][$lte]="+moment(endDate).add(2, "days").format("YYYY-MM-DD"));
		
		const url = baseUrl + "api/v1/treatments?" + parts.join("&");
		return url;
	};

	https.get(buildUrl(baseUrl), res => {
		let data = '';
	
		res.on("data", chunk => {
			data += chunk;
		});
	
		res.on("end", () => {
			displayMealData(data);
		});
	
	}).on('error', e => {
		console.error(e);
	});

	const displayMealData = mealData => {
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
	
		// console.log(`\nFound ${sorted.length} entries between ${startDate.format("MMMM Do YYYY")} and ${endDate.format("MMMM Do YYYY")}: \n`);
	
		_.each(sorted, entry => {
			console.log(formatEntry(entry));
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
	
		console.log("\nSTATS");
		console.log(formatMealStats("Breakfast", calculateMealStats(breakfastCarbsByDay)));
		console.log(formatMealStats("Lunch", calculateMealStats(lunchCarbsByDay)));
		console.log(formatMealStats("Dinner", calculateMealStats(dinnerCarbsByDay)));
	};
}

const formatEntryType = entry => (entry.eventType);
const formatEntryCarbs = entry => ((entry.carbs || 0) + "g");
const formatEntryInsulin = entry => ((entry.insulin || 0) + " units");
const formatEntryTime = entry => (entry.created_at.format("dddd, MMMM Do YYYY, h:mm:ss a"));
const formatEntry = entry => (
	formatEntryType(entry) +
	": " +
	formatEntryInsulin(entry) +
	" for " +
	formatEntryCarbs(entry) +
	" at " +
	formatEntryTime(entry)
);

const printEntry = entry => {
	console.log(formatEntry(entry));
};


