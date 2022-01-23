const { currentWeekState, weekStatesByYear } = require('./data.json')

module.exports = {
  locals: {
    currentWeekState,
    weekStatesByYear,
  },
}
