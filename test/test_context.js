import context from '../src/context';
import Time from '../src/time';

const CONFIGURATION_1 = {
  context: {
    blind: {
      type: 'enum'
    },
    time: {
      type: 'time_of_day',
      is_generated: true
    },
    day: {
      type: 'day_of_week'
    },
    date: {
      type: 'day_of_month'
    },
    month: {
      type: 'month_of_year'
    },
    tz: {
      type: 'timezone'
    },
    happiness: {
      type: 'continuous'
    }
  },
  output: [
    'happiness'
  ],
  time_quantum: 600
};

describe('context(...)', function() {
  it('is able to create a context skeleton', function() {
    expect(
      context(
        CONFIGURATION_1
      )
    ).to.be.deep.equal({
      blind: undefined,
      day: undefined,
      date: undefined,
      month: undefined,
      time: undefined,
      tz: undefined
    });
  });

  it('is able to fill the relevant keys using the given time', function() {
    expect(
      context(
        CONFIGURATION_1,
        {
          blind: 'closed'
        },
        new Time('2016-06-09T18:28:49.000Z', '-05:00')
      )
    ).to.be.deep.equal({
      blind: 'closed',
      day: 3,
      time: 13.480277777777777,
      date: 9,
      month: 6,
      tz: '-05:00'
    });
  });

  it('is able to overrides the relevant keys using the given time', function() {
    expect(
      context(
        CONFIGURATION_1,
        {
          blind: 'opened',
          day: 4,
          time: 12.5,
          date: 1,
          month: 10,
          tz: '+03:00'
        },
        new Time('2016-06-09T18:28:49.000Z', '-05:00')
      )
    ).to.be.deep.equal({
      blind: 'opened',
      day: 3,
      time: 13.480277777777777,
      date: 9,
      month: 6,
      tz: '-05:00'
    });
  });

  it('is able to overrides the given time using the relevant keys', function() {
    expect(
      context(
        CONFIGURATION_1,
        new Time('2016-06-09T18:28:49.000Z', '-05:00'),
        {
          blind: 'opened',
          day: 4,
          time: 12.5,
          date: 10,
          month: 1,
          tz: '+03:00'
        }
      )
    ).to.be.deep.equal({
      blind: 'opened',
      day: 4,
      time: 12.5,
      date: 10,
      month: 1,
      tz: '+03:00'
    });
  });

  it('is able to select the actually needed keys', function() {
    expect(
      context(
        CONFIGURATION_1,
        {
          blind: 'opened',
          day: 4,
          time: 12.5,
          date: 9,
          month: 6,
          tz: '+03:00',
          foo: 34
        }
      )
    ).to.be.deep.equal({
      blind: 'opened',
      day: 4,
      time: 12.5,
      date: 9,
      month: 6,
      tz: '+03:00'
    });
  });

  it('is able to generate the relevant keys using the given time', function() {
    expect(
      context(
        CONFIGURATION_1,
        new Time('2016-06-09T18:28:49.000Z', '-05:00')
      )
    ).to.be.deep.equal({
      blind: undefined,
      day: 3,
      time: 13.480277777777777,
      date: 9,
      month: 6,
      tz: '-05:00'
    });
  });
});
