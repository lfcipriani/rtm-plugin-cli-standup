'use strict';

// Import rtm-cli to use the utility functions
const rtm = require('rtm-cli');
const api = require('rtm-api');
const moment = require('moment-business-days');

/**
 * Returns array of tasks in a day for the type requested
 * @param {Date} day day to be queried
 * @param {string} filter task filter to be prepended
 * @param {string} type One of 'completed' or 'due'
 * @param {Function} callback a callback
 * @private
 */
function _getTaskNames(day, filter, type, callback) {
  var typedFilter = filter + " "+ type +":" + day;

  rtm.config.user(function(user) {

    //console.log(type + "Filter: " + typedFilter);
    user.tasks.get(typedFilter, function (err, tasks) {

      if ( err ) {
        rtm.log.spinner.error("Could not get tasks for "+ day +" (" + err.msg + ")");
        callback(null);
      }
      let taskNames = [];
      tasks.forEach(function(task){
        taskNames.push(task.name);
      });
      callback(taskNames);

    });

  });
}

/**
 * Print tasks as bullet list in Markdown
 * @param {Array} tasks List of task names
 */
function _printTasks(tasks) {
  for (var i=0; i < tasks.length; i++) {
    rtm.log("    - " + tasks[i]);
  }
}

/**
 * Standup Command
 * Print a daily standup meeting report
 * @param {Array} args List of command arguments
 * @param {Object} env Commander environment
 */
function action(args, env) {

  moment.updateLocale('us', {
    workingWeekdays: [1, 2, 3, 4, 5],
    holidays: [
      '2021-03-08',
      '2021-04-02',
      '2021-04-04',
      '2021-04-05',
      '2021-05-01',
      '2021-05-13',
      '2021-05-24',
      '2021-10-03',
      '2021-12-25',
      '2021-12-26'],
    holidayFormat: 'YYYY-MM-DD'
  });

  let filter = args.length > 0 ? args[0].join(' ') : '';

  let today = env.date !== undefined ? env.date : moment().format("DD/MM/YYYY");
  let previousWorkday = moment(today, 'DD/MM/YYYY').businessSubtract(1).format("DD/MM/YYYY");
  let yesterday = moment(today, 'DD/MM/YYYY').subtract(1, 'd');
  let fancyFilter = "";

  if (yesterday.diff(moment(previousWorkday, 'DD/MM/YYYY')) >= 1) {
    // Take into account tasks that might be completed in the weekend or holidays
    fancyFilter = "Before:"+ today +" completedAfter";
  }

  rtm.log("Standup update from @Luis Cipriani:\n");

  _getTaskNames(previousWorkday, filter, "completed"+fancyFilter, (completed) => {
    if (completed === null) {
      rtm.finish();
    } else {
      rtm.log("*What you did in the previous work day?* ("+ previousWorkday +")");
      _printTasks(completed);
      rtm.log("");
      
      _getTaskNames(today, filter, "completed", (completedToday) => {
        if (completedToday === null) {
          rtm.finish();
        } else {
          rtm.log("*What you will do today?* ("+ today +")");
          _printTasks(completedToday);
          
          _getTaskNames(today, filter, "due", (due) => {
            if (due !== null) {

              // eliminating duplicates
              var distinctDue = [];
              for (var i=0; i < due.length; i++) {
                var distinct = true;
                for (var j=0; j < completedToday.length; j++) {
                  if (due[i] === completedToday[j]) {
                    distinct = false;
                    break;
                  }
                }
                if (distinct) {
                  distinctDue.push(due[i]);
                }
              }

              _printTasks(distinctDue);
            }
            rtm.finish();
          });
        }
      });
    } 
  });
}

/**
 * Define the command properties here
 */
module.exports = {

  /**
   * Command definition:
   * command name and argument definition
   */
  command: "standup [filter...]",

  /**
   * Command options:
   * add option flags to the command
   */
  options: [
    {
      option: "-d, --date <DD/MM/YYYY>",
      description: "Date for the report. If you omit the default is today's date."
    }
  ],

  /**
   * Command description:
   * short helpful description of the command
   */
  description: "Print daily standup meeting report for the given day.",

  /**
   * Command action:
   * the function called when executing the command
   */
  action: action

};
