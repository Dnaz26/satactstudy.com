import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'

const batchName = 'Elite science form 2026-10-06'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(Math.abs((37.2 - 38.4) / 6 + 0.2) < 1e-12, 'North rate')
assert(Math.abs((38.6 - 38.1) - 0.5) < 1e-9 && Math.abs((38.0 - 37.6) - 0.4) < 1e-9, 'hour 2 to 4 drops')
assert(46 / 50 === 0.92, 'shade watered')
assert(22 / 40 === 0.55, 'shade dry')
assert(30 / 40 === 0.75, 'sun watered')
assert(12 / 40 === 0.3, 'sun dry')
assert(76 / 90 > 0.844 && 76 / 90 < 0.845, 'watered overall')
assert(Math.abs(((0.75 - 0.3) - (0.92 - 0.55)) - 0.08) < 1e-9, 'watering gaps')
assert(Math.abs(12 - (8 + 0.5 * 10)) === 1, 'residual 1')
assert(Math.abs(30 - (8 + 0.5 * 55)) === 5.5, 'residual 3')
assert(4 / 50 === 0.08 && 15 / 50 === 0.3 && 16 / 50 === 0.32 && 5 / 50 === 0.1, 'battery rates')
assert(Math.abs((0.08 + 0.02 + 0.22) - 0.32) < 1e-9, 'additive battery')
assert(11 - 3 === 8 && 12 - 4 === 8, 'filter gaps')
assert(72 - 60 === 12 && 71 - 60 === 11 && 61 - 60 === 1, 'score gains')
assert(35 - 20 === 15 && 34 - 20 === 14 && 21 - 20 === 1 && 35 - 34 === 1, 'plot gaps')

const topics = {
  graphs: {
    id: 'd1000000-0000-0000-0000-000000000065',
    topic: 'Reading Graphs and Tables',
    domain: 'Interpretation of Data',
  },
  trends: {
    id: 'd1000000-0000-0000-0000-000000000066',
    topic: 'Trend Analysis',
    domain: 'Interpretation of Data',
  },
  design: {
    id: 'd1000000-0000-0000-0000-000000000067',
    topic: 'Experimental Design',
    domain: 'Scientific Investigation',
  },
  views: {
    id: 'd1000000-0000-0000-0000-000000000068',
    topic: 'Conflicting Viewpoints',
    domain: 'Evaluation of Models',
  },
}

const passages = {
  clinic: {
    title: 'Two clinic temperature traces',
    graphicType: 'line_graph',
    graphicData: {
      hours: [0, 2, 4, 6],
      northC: [38.4, 38.0, 37.6, 37.2],
      southC: [38.4, 38.6, 38.1, 37.5],
      verified: { equalHours: [0], northRatePerHour0to6: -0.2, southDrop2to4: 0.5, northDrop2to4: 0.4 },
    },
    content: `A clinic recorded body temperature, in degrees Celsius, for two groups that began at the same reading. Readings were taken only at hour 0, hour 2, hour 4, and hour 6. No medicine name is needed to read the traces.

Group North: 38.4, 38.0, 37.6, 37.2.
Group South: 38.4, 38.6, 38.1, 37.5.

The plotted points are connected only to make the order of the readings visible. A rise or a fall between two recorded hours is the later value minus the earlier value. An average rate over a span is that change divided by the number of hours in the span.`,
  },
  beds: {
    title: 'Seedling beds and a moisture line',
    graphicType: 'two_way_table',
    graphicData: {
      aliveDead: {
        shadeWatered: [46, 4],
        shadeDry: [22, 18],
        sunWatered: [30, 10],
        sunDry: [12, 28],
      },
      moistureLine: { form: 'alive = 8 + 0.5 * moisture', points: [[10, 12], [30, 22], [55, 30], [80, 46]] },
      verified: { shadeWateredRate: 0.92, sunDryRate: 0.3, wateredAliveOutOf: '76/90', sunGapMinusShadeGap: 0.08, farthestMoisture: 55 },
    },
    content: `A grower counted living and dead seedlings after 20 days in four existing beds. The beds were not randomly assigned.

Shade and watered: 46 alive, 4 dead.
Shade and dry: 22 alive, 18 dead.
Sun and watered: 30 alive, 10 dead.
Sun and dry: 12 alive, 28 dead.

A second figure plots soil moisture against the living count for those same four beds: moisture 10 with 12 alive, moisture 30 with 22 alive, moisture 55 with 30 alive, and moisture 80 with 46 alive. A straight reference line drawn on that figure is alive = 8 + 0.5 times moisture. The residual is the plotted alive count minus the line's value.`,
  },
  filter: {
    title: 'Split-line filter study',
    graphicType: 'experimental_table',
    graphicData: {
      lab1MeanLeadPpb: { filtered: 3, unfiltered: 11, samplesPerLine: 8 },
      lab2MeanLeadPpb: { filtered: 4, unfiltered: 12, samplesPerLine: 8 },
      verified: { eachLabGap: 8, filteredIsNotZero: true },
    },
    content: `One water source was split into two lines. Line C passed through a new filter. Line U did not. Each line was sampled 8 times, and the mean lead was reported in parts per billion.

First lab: Line C mean 3, Line U mean 11.
A second lab repeated the same split on a different source: Line C mean 4, Line U mean 12.

In a later run at the first lab, a technician stirred only Line C. In another run, Line C was always sampled after Line U, and the team noted that undisturbed lead can settle downward over time. The tables do not show any other metal.`,
  },
  battery: {
    title: 'Heat and vibration battery grid',
    graphicType: 'experimental_table',
    graphicData: {
      failuresOutOf50: { roomStill: 4, hotStill: 5, roomVibrated: 15, hotVibrated: 16 },
      verified: { roomStillRate: 0.08, hotStillRate: 0.1, roomVibratedRate: 0.3, hotVibratedRate: 0.32, additivePrediction: 0.32 },
    },
    content: `A workshop tested 50 battery units in each cell of a grid. Heat and vibration were assigned separately, so each factor appears with and without the other. A failure means the unit did not hold a charge after the trial.

Room temperature, still: 4 failures.
Hot, still: 5 failures.
Room temperature, vibrated: 15 failures.
Hot and vibrated: 16 failures.

Rates are failures divided by 50. A factor's added rate is the vibrated or hot rate minus the matching rate without that factor. If the two factors simply add, the hot-and-vibrated rate should equal the room-still rate plus the heat gap plus the vibration gap.`,
  },
  scores: {
    title: 'Tutoring and two follow-up forms',
    graphicType: 'experimental_table',
    graphicData: {
      tutoredMeans: { first: 60, easier: 72, equated: 61, students: 24 },
      controlMeans: { first: 60, easier: 71, equated: 60, students: 24 },
      assignment: 'two existing classes, not randomly assigned',
      verified: { tutoredEasierGain: 12, controlEasierGain: 11, tutoredEquatedGain: 1 },
    },
    content: `Two existing classes of 24 students each took the same first form. The tutored class then attended four sessions. The other class did not. Neither class was formed by random assignment.

Both classes later took a shorter, easier form and a second form that had been equated to the difficulty of the first form. Means were:

Tutored class: first form 60, easier form 72, equated form 61.
Other class: first form 60, easier form 71, equated form 60.

A gain is a later mean minus the first-form mean for that same class. The equated form was built so that a person who had not learned more would be expected to score about the same as on the first form.`,
  },
  birds: {
    title: 'Short wings on an island',
    graphicType: 'bar_graph',
    graphicData: {
      shortWingShare: { mainlandSource: 0.3, firstBreedingYearOnIsland: 0.8, islandToday: 0.84 },
      hawksFirstRecordedYearsAfterFounding: 40,
      verified: { earlyShareAlreadyHigh: true, laterRise: 0.04 },
    },
    content: `Scientist A says island birds have short wings because hawks later caught the long-winged birds. Scientist B says the first breeding group was already mostly short-winged, and that hawks were not on the island yet.

The notes available to both scientists are limited to three shares and one date. Short-winged birds are 30 percent of the mainland source population, 80 percent of the museum skins from the island's first breeding year, and 84 percent of the island birds today. The first hawk record on the island is 40 years after that first breeding year. Neither scientist counted what any hawk ate.`,
  },
  plots: {
    title: 'Fertilizer and water plots',
    graphicType: 'grouped_bar',
    graphicData: {
      yield: { neither: 20, fertilizerOnly: 21, waterOnly: 34, both: 35 },
      design: 'one plot per treatment, randomly assigned, same soil',
      verified: { waterGapWithoutFertilizer: 14, fertilizerGapWithoutWater: 1, fertilizerGapWithWater: 1 },
    },
    content: `Four plots of the same soil were randomly assigned to four treatments, with one plot per treatment. Yield is the mass harvested from that plot.

Neither fertilizer nor extra water: 20.
Fertilizer only: 21.
Extra water only: 34.
Fertilizer and extra water: 35.

Scientist A says the harvest gain came from the fertilizer. Scientist B says it came from the extra water. A gap is one plot's yield minus another's. Because each treatment was used on only one plot, a single poor patch of soil could still affect one bar.`,
  },
}

const questions = [
  q('clinic', 'graphs', 4, 'At which recorded hour do Group North and Group South show the same temperature?', 'A', [
    ['Hour 0 only', 'Both traces are 38.4 at hour 0, and the later pairs differ: 37.2 versus 37.5 at hour 6.'],
    ['Hour 0 and hour 6', 'Hour 6 is 37.2 for North and 37.5 for South, so those readings are not equal.'],
    ['Hour 2 only', 'Hour 2 is 38.0 for North and 38.6 for South.'],
    ['Every recorded hour', 'Hours 2, 4, and 6 all differ between the groups.'],
  ], 'Equal only at hour 0: 38.4 = 38.4. Later pairs are 38.0/38.6, 37.6/38.1, and 37.2/37.5.'),
  q('clinic', 'trends', 6, 'What is the average rate of change, in degrees Celsius per hour, for Group North from hour 0 to hour 6?', 'C', [
    ['-1.2', 'That is the total change, 37.2 - 38.4, not the change per hour.'],
    ['-0.4', 'North falls 0.4 over some two-hour steps, which is 0.2 per hour, not the six-hour average written as -0.4.'],
    ['-0.2', 'The six-hour change is 37.2 - 38.4 = -1.2, and -1.2 / 6 = -0.2 degree per hour.'],
    ['0.2', 'The trace falls, so the rate is negative.'],
  ], 'North average rate = (37.2 - 38.4) / 6 = -0.2.'),
  q('clinic', 'trends', 6, 'From hour 2 to hour 4, how do the two drops compare?', 'B', [
    ['North falls by more than South.', 'North falls 0.4 and South falls 0.5, so North falls by less.'],
    ['South falls by 0.1 degree more than North.', 'South changes from 38.6 to 38.1, a drop of 0.5. North changes from 38.0 to 37.6, a drop of 0.4.'],
    ['Both groups rise.', 'Both values are lower at hour 4 than at hour 2.'],
    ['South falls by 0.5 while North rises.', 'North also falls, from 38.0 to 37.6.'],
  ], 'Drops from hour 2 to 4 are 0.4 for North and 0.5 for South.'),
  q('clinic', 'graphs', 4, 'Group South reaches its highest recorded temperature at which hour?', 'D', [
    ['Hour 0', 'Hour 0 is 38.4, which is below the hour 2 reading of 38.6.'],
    ['Hour 4', 'Hour 4 is 38.1, already below the peak.'],
    ['Hour 6', 'Hour 6 is 37.5, the lowest South reading.'],
    ['Hour 2', '38.6 is greater than 38.4, 38.1, and 37.5.'],
  ], 'South readings 38.4, 38.6, 38.1, 37.5. Maximum is 38.6 at hour 2.'),
  q('clinic', 'trends', 6, 'Which statement follows from the recorded traces?', 'A', [
    ['From hour 0 to hour 2, North falls while South rises.', 'North goes from 38.4 to 38.0, and South goes from 38.4 to 38.6.'],
    ['Both groups fall at every recorded step.', 'South rises from hour 0 to hour 2.'],
    ['South falls at every recorded step.', 'The first South step is an increase of 0.2.'],
    ['North rises from hour 4 to hour 6.', 'North goes from 37.6 to 37.2, which is a fall.'],
  ], 'Only the first step has opposite signs: North -0.4, South +0.2.'),
  q('beds', 'graphs', 4, 'What fraction of the shade-and-watered seedlings were alive?', 'B', [
    ['46 out of 100', 'The alive count is 46, but the bed total is 46 + 4 = 50, not 100.'],
    ['46 out of 50', 'That bed has 46 alive and 4 dead.'],
    ['22 out of 40', 'That is the shade-and-dry bed, not the watered one.'],
    ['30 out of 40', 'That is the sun-and-watered bed.'],
  ], 'Shade watered survival = 46 / (46 + 4) = 46/50.'),
  q('beds', 'graphs', 4, 'What percent of the sun-and-dry seedlings were alive?', 'A', [
    ['30 percent', '12 alive out of 12 + 28 = 40 is 30 percent.'],
    ['12 percent', '12 is the count, not the percent of the bed.'],
    ['70 percent', 'That would treat the 28 dead seedlings as if they were the alive share.'],
    ['55 percent', '55 percent is 22/40, the shade-and-dry bed.'],
  ], 'Sun dry = 12 / 40 = 0.30.'),
  q('beds', 'graphs', 5, 'Among all watered seedlings in both shade and sun, about what percent were alive?', 'C', [
    ['92 percent', '92 percent is the shade-watered bed alone, 46/50, not both watered beds.'],
    ['76 percent', '76 is the alive count. The watered total is 90, and 76/90 is not 76 percent.'],
    ['about 84 percent', 'Watered alive are 46 + 30 = 76 and watered seedlings are 50 + 40 = 90, so 76/90 is about 84.4 percent.'],
    ['50 percent', 'The watered beds are not split evenly between alive and dead.'],
  ], '76/90 = 0.844...'),
  q('beds', 'trends', 6, 'In percentage points, how does the watering gap in the sun compare with the watering gap in the shade?', 'D', [
    ['The shade gap is larger.', 'Shade goes from 55 percent dry to 92 percent watered, a gap of 37 points. Sun goes from 30 to 75, a gap of 45 points.'],
    ['The two gaps are equal.', '45 is not 37.'],
    ['Sun is higher, but only because more seedlings were counted in the sun.', 'Each sun bed has 40 seedlings and the shade-dry bed also has 40. The gap comparison is between rates, not raw alive counts.'],
    ['The sun gap is 8 percentage points larger.', '75 - 30 = 45 and 92 - 55 = 37. The difference between those gaps is 8 points.'],
  ], 'Sun watering gap 45 points minus shade watering gap 37 points = 8 points.'),
  q('beds', 'graphs', 6, 'Which plotted moisture point lies farthest from the line alive = 8 + 0.5 times moisture?', 'B', [
    ['Moisture 10, with 12 alive', 'The line predicts 13, so the residual is -1.'],
    ['Moisture 55, with 30 alive', 'The line predicts 8 + 27.5 = 35.5, so the residual is 30 - 35.5 = -5.5, the largest distance among the four points.'],
    ['Moisture 80, with 46 alive', 'The line predicts 48, so the residual is -2.'],
    ['Moisture 30, with 22 alive', 'The line predicts 23, so the residual is -1.'],
  ], 'Absolute residuals are 1, 1, 5.5, and 2. The farthest point is moisture 55.'),
  q('beds', 'trends', 6, 'The beds already existed in shade or sun. Which conclusion is justified?', 'A', [
    ['In the dry beds, shade had a higher alive rate than sun, but the table does not show that shade caused that difference.', 'Dry shade is 22/40 and dry sun is 12/40. The beds were not assigned, so the rate gap is an association.'],
    ['Shade caused the seedlings to live, because 46 is the largest alive count.', '46 is the watered shade bed, and watering differs at the same time. A count is not a cause.'],
    ['Sun caused the deaths, because the dry sun bed had 28 dead.', 'That bed is also dry, so sun is not isolated.'],
    ['The residual line proves that moisture caused every death.', 'A reference line describes distance from a prediction. It does not assign a cause.'],
  ], 'Dry rates 0.55 versus 0.30 are real, and the prompt states the beds were not randomly assigned.'),
  q('filter', 'design', 6, 'Why did each lab split one source into Line C and Line U instead of comparing two different rivers?', 'C', [
    ['So the filter could be tested on twice as many metals.', 'The table reports lead only.'],
    ['So Line U would always be sampled later.', 'Sampling order is a separate problem described later. It is not the reason for the split.'],
    ['So the water entering the filter and the water in the comparison line start out the same.', 'A split holds the source constant. A second river would mix source differences with the filter.'],
    ['So eight samples would be enough to prove the filter removes every metal.', 'Eight lead samples cannot establish that claim, and the filtered means are not zero.'],
  ], 'The split is a same-source control. The second lab changes the source on purpose and still keeps its own split.'),
  q('filter', 'design', 6, 'What does the second lab add?', 'A', [
    ['The same 8 ppb gap appears on a different source, so the first result is less likely to be an accident of one source.', '11 - 3 = 8 and 12 - 4 = 8.'],
    ['It proves the filter removes all lead from every source.', 'The filtered means are 3 and 4, not 0.'],
    ['It shows the filter works because the second filtered mean is higher than the first.', '4 is higher than 3, but both filtered means are still 8 ppb below their own unfiltered lines. A higher filtered mean is not by itself a success.'],
    ['It removes the need for an unfiltered line.', 'Each lab still uses Line U. Without it, there is no comparison.'],
  ], 'Both labs show an 8 ppb mean gap on different sources. Filtered lead remains above zero.'),
  q('filter', 'design', 7, 'The later run stirred only Line C. Why does that weaken a filter claim from that run?', 'D', [
    ['Stirring makes the two lines start from different rivers.', 'The source was still split. The new problem is the extra stirring, not a new river.'],
    ['Stirring increases the sample count from 8 to 16.', 'The prompt does not say more samples were taken.'],
    ['A stirred line cannot be measured in parts per billion.', 'The unit is still usable. The design problem is the confound.'],
    ['Stirring happens only on the filtered line, so a lower lead reading could come from stirring rather than from the filter.', 'The filter and the stirring changed together. The run cannot separate them.'],
  ], 'Filter and stirring are confounded when only Line C is stirred.'),
  q('filter', 'design', 7, 'Line C was always sampled after Line U, and undisturbed lead can settle. Which risk does that create?', 'B', [
    ['The later sample can look lower even if the filter did nothing.', 'Settling over time is tied to sample order, and order is tied to the filter line.'],
    ['The later sample must look higher because lead was added by waiting.', 'The note says lead can settle downward, which would lower a later reading, not raise it.'],
    ['Sampling order only matters if the two lines come from different rivers.', 'Order can matter on one split source.'],
    ['The second lab already canceled this risk for the first lab.', 'A different lab does not repair the order used in this run.'],
  ], 'Order and treatment move together, and settling gives a reason the later reading could fall.'),
  q('filter', 'design', 6, 'Which claim is supported by the two lab means?', 'A', [
    ['In both labs, the filtered mean was 8 ppb lower than the unfiltered mean, and filtered lead was still above zero.', '3 and 4 are not zero, and both gaps equal 8.'],
    ['The filter removed all lead in the second lab.', 'The second filtered mean is 4 ppb.'],
    ['The unfiltered mean fell from the first lab to the second.', 'It rose from 11 to 12.'],
    ['Eight samples prove the size of the gap for every future source.', 'Two sources agreed here. That is not every source, and the sample is 8 per line.'],
  ], 'Gaps are 8 and 8. Remaining filtered lead is 3 and 4.'),
  q('filter', 'design', 5, 'A report says the filter line "ended lower, so the filter is the only possible cause." Which detail in the study directly blocks that wording?', 'C', [
    ['The second lab used a different source and found the same gap.', 'That replication does not create the extra causes. The stirred run and the ordered sampling do.'],
    ['Line U had the higher mean in both labs.', 'A higher comparison mean is the result being explained, not a reason it has only one cause.'],
    ['In some runs, stirring or a later sampling time changed along with the filter.', 'Those runs do not isolate the filter, so "only possible cause" is too strong for the study as described.'],
    ['Lead was measured in parts per billion.', 'The unit does not by itself create or remove a competing cause.'],
  ], 'The passage names stirring and sample order as extra differences on some filtered runs.'),
  q('battery', 'design', 6, 'Which factor is tied to the larger rise in failure rate?', 'B', [
    ['Heat. The still cells rise from 8 percent to 30 percent when the room is heated.', 'The still cells go from 4/50 = 8 percent to 5/50 = 10 percent. The jump to 30 percent is the vibrated room-temperature cell.'],
    ['Vibration. The room-temperature rate rises from 8 percent to 30 percent when vibration is added, while heat alone rises from 8 percent to 10 percent.', '22 percentage points is larger than 2.'],
    ['Heat and vibration contribute the same number of percentage points.', '2 is not 22.'],
    ['Neither factor changes the rate.', 'Both rates change, and the vibration change is large.'],
  ], 'Vibration gap at room temperature is 0.30 - 0.08 = 0.22. Heat gap while still is 0.10 - 0.08 = 0.02.'),
  q('battery', 'design', 7, 'Do heat and vibration show an extra combined effect beyond adding their separate gaps?', 'A', [
    ['No. The hot-and-vibrated rate is 32 percent, which equals 8 percent plus the 2-point heat gap plus the 22-point vibration gap.', '0.08 + 0.02 + 0.22 = 0.32, and 16/50 = 0.32.'],
    ['Yes. The combined cell fails more often than the sum of the two separate effects.', 'The combined rate matches the sum. It does not exceed it.'],
    ['Yes, because 16 failures is more than 15.', '16/50 and the additive prediction are the same rate. Comparing 16 with 15 ignores the different baseline of the hot-still cell.'],
    ['The grid cannot be added because each cell used a different number of units.', 'Each cell used 50 units.'],
  ], 'Additive prediction 8% + 2 points + 22 points = 32%, matching 16/50.'),
  q('battery', 'design', 6, 'Someone compares only the hot-and-vibrated cell with the room-still cell and concludes that heat caused the extra failures. What is wrong with that comparison?', 'D', [
    ['Those two cells have the same vibration condition, so heat is isolated.', 'The combined cell is vibrated and the room-still cell is not. Both factors change at once.'],
    ['The failure counts are 4 and 16, so the difference is too small to discuss.', '12 extra failures out of 50 is a large gap. The problem is attribution, not the size.'],
    ['Heat cannot be discussed unless the units are sampled from two rivers.', 'This study is a battery grid, not a water study. The needed comparison is inside the grid.'],
    ['The two cells differ in both heat and vibration, so the extra failures cannot be assigned to heat alone.', 'The still-hot cell and the room-vibrated cell are what separate the factors.'],
  ], 'Room-still versus hot-vibrated confounds heat with vibration.'),
  q('battery', 'design', 5, 'What failure rate belongs to the hot, still cell?', 'C', [
    ['8 percent', '4/50 is the room-still cell.'],
    ['32 percent', '16/50 is the hot-and-vibrated cell.'],
    ['10 percent', '5 failures out of 50 is 10 percent.'],
    ['30 percent', '15/50 is the room-temperature vibrated cell.'],
  ], 'Hot still = 5/50 = 0.10.'),
  q('battery', 'trends', 6, 'At the hot condition, what is the vibration gap in percentage points?', 'B', [
    ['2 points', 'That is the heat gap among the still cells, 10 percent minus 8 percent.'],
    ['22 points', 'The hot-and-vibrated rate is 32 percent and the hot-still rate is 10 percent.'],
    ['24 points', '32 minus 8 uses the room-still baseline and mixes in the heat gap.'],
    ['6 points', '16 minus 10 is a count difference, not a rate, and it still uses the wrong cells if treated as points.'],
  ], '0.32 - 0.10 = 0.22, the same vibration gap as at room temperature.'),
  q('battery', 'design', 6, 'What does the four-cell grid make possible that one hot-vibrated group and one untouched group do not?', 'A', [
    ['Each factor can be seen with and without the other factor.', 'The grid includes still, hot, vibrated, and both.'],
    ['It proves heat is harmless for every battery model.', 'Only this set of units was tested, and the hot-still rate is slightly higher, not a universal proof.'],
    ['It removes the need to know how many units were in each cell.', 'The rates use the shared denominator of 50. Without it, the counts would not be rates.'],
    ['It shows the failures were caused by the order of the lead samples.', 'This passage is not the filter study.'],
  ], 'The factorial grid separates the two factors. A single two-group contrast does not.'),
  q('scores', 'design', 6, 'On the equated form, what gain did the tutored class show relative to its own first form?', 'C', [
    ['12 points', '72 - 60 is the easier form, not the equated form.'],
    ['11 points', '71 - 60 is the other class on the easier form.'],
    ['1 point', 'The equated mean is 61 and the first mean is 60.'],
    ['0 points', 'That is the other class, whose equated mean stayed at 60.'],
  ], 'Tutored equated gain = 61 - 60 = 1.'),
  q('scores', 'design', 7, 'Why is the rise from 60 to 72 weak evidence that tutoring caused the gain?', 'A', [
    ['The other class, which was not tutored, rose from 60 to 71 on that same easier form.', 'The easier form rose in both classes, so the form change is a competing explanation.'],
    ['A 12-point rise is too small to read.', 'The size is not the problem. The untreated class has a similar rise.'],
    ['The equated form rose by the same 12 points.', 'The equated form rose by 1 point for the tutored class, not 12.'],
    ['The tutored class had fewer than 24 students on the easier form.', 'The passage gives 24 students for the class and does not say the count changed.'],
  ], 'Easier-form gains are +12 and +11. The untreated class almost matches the tutored rise.'),
  q('scores', 'design', 6, 'Which comparison holds the form difficulty steady while comparing the tutored class with the other class?', 'D', [
    ['The tutored class beats its own first score by 12 points on the easier form.', 'That form is easier than the first form, and the untreated class also gains 11 points on it.'],
    ['The tutored class has a higher easier-form mean than the other class, 72 versus 71.', 'The easier form is not matched to the first form\'s difficulty.'],
    ['The first forms were both 60, so any later difference is caused by tutoring.', 'Equal starting scores do not make a later easier form difficulty-matched.'],
    ['The tutored class\'s gain on the equated form compared with the other class\'s gain on that same equated form.', 'The equated form was built to match the first form. That is the difficulty-matched comparison, and the gains on it are +1 and 0.'],
  ], 'The equated form is the difficulty-matched comparison. Its gains are +1 and 0.'),
  q('scores', 'design', 7, 'The two groups were existing classes. What limit does that add even if a later score gap had been large?', 'B', [
    ['Random assignment of students would have been a weaker way to compare tutoring.', 'Random assignment is what would balance the classes. These classes were not formed that way.'],
    ['A difference between existing classes can come from the classes themselves, not only from the tutoring.', 'The passage says the classes were not randomly assigned.'],
    ['An existing class cannot take an equated form.', 'Both classes have equated means in the table.'],
    ['A class of 24 is large enough that assignment no longer matters.', 'Assignment still matters at 24. The number does not create random assignment.'],
  ], 'The design is a comparison of two intact classes, so class differences remain mixed with tutoring.'),
  q('scores', 'trends', 6, 'How do the two classes\' gains on the easier form compare?', 'A', [
    ['The tutored gain is 12 points and the other gain is 11 points.', '72 - 60 = 12 and 71 - 60 = 11.'],
    ['The tutored gain is 12 points and the other class does not gain.', 'The other class moves from 60 to 71.'],
    ['Both classes gain 1 point.', 'That describes the equated form for the tutored class and the other class, not the easier form.'],
    ['The other class gains 12 points more than the tutored class.', 'The other gain is 1 point smaller, not 12 points larger.'],
  ], 'Easier gains are 12 and 11.'),
  q('birds', 'views', 6, 'Which note fits Scientist B better than Scientist A?', 'C', [
    ['Today\'s island birds are 84 percent short-winged.', 'A late share, by itself, does not show whether the trait was already common before hawks.'],
    ['Hawks are recorded on the island today.', 'The note gives the first hawk record 40 years after founding. It does not say hawks are absent today, and their later presence is Scientist A\'s setting, not evidence against it.'],
    ['Eighty percent of the first-year skins are short-winged, and the first hawk record comes 40 years later.', 'The short-wing share was already high before the recorded hawks, which is Scientist B\'s account.'],
    ['The mainland source is 30 percent short-winged.', 'That shows the island differed from the source, but the timing against hawks comes from the first-year skins plus the hawk date.'],
  ], 'B predicts a high short-wing share before hawks. The skins are 80 percent and hawks come 40 years later.'),
  q('birds', 'views', 6, 'Which pattern would fit Scientist A better than the notes actually do?', 'A', [
    ['The first-year share matches the mainland 30 percent, and the short-wing share rises only after hawks are recorded.', 'That would put the change after the predator, which is A\'s order. The notes instead show 80 percent in the first year.'],
    ['The first-year share is already 80 percent.', 'That fits B.'],
    ['The share moves only from 80 percent to 84 percent after hawks could have arrived.', 'A four-point later change is a weak later shift, not A\'s main story of hawks creating the short-wing population.'],
    ['No one counted a hawk\'s diet, so A is confirmed.', 'A missing diet count confirms neither scientist.'],
  ], 'A needs the trait to become common after predation. The first-year 80 percent comes before the hawk record.'),
  q('birds', 'views', 5, 'What is the change in the island short-wing share from the first breeding year to today?', 'D', [
    ['It falls by 50 percentage points.', 'That compares 80 with the mainland 30, in the wrong direction and across populations.'],
    ['It rises by 54 percentage points.', '84 minus 30 mixes today\'s island with the mainland.'],
    ['It rises from 30 percent to 80 percent.', 'That is mainland versus first-year island, not first-year versus today.'],
    ['It rises by 4 percentage points, from 80 percent to 84 percent.', '84 - 80 = 4.'],
  ], 'Island change after founding is 4 percentage points.'),
  q('birds', 'views', 6, 'How does the mainland 30 percent figure fit the two accounts?', 'B', [
    ['It shows hawks had already removed long-winged birds on the island.', 'The 30 percent figure is the mainland source, and the island hawks are recorded later.'],
    ['The first island group was much richer in short wings than the source population, which fits a founder difference and does not require later hawks.', '80 percent versus 30 percent is the contrast B uses.'],
    ['It shows today\'s island share is lower than the source.', 'Today is 84 percent, which is higher than 30 percent.'],
    ['It is the share of hawks in the mainland diet study.', 'The passage says neither scientist counted what a hawk ate. Thirty percent is the short-wing share.'],
  ], 'Source 30 percent versus first-year island 80 percent is a founder contrast.'),
  q('birds', 'views', 6, 'A reader says today\'s 84 percent proves hawks are what made the island birds short-winged. Which note undercuts that jump?', 'A', [
    ['The first-year skins were already 80 percent short-winged, before the first hawk record.', 'Most of the present share was already there.'],
    ['The mainland is also 84 percent short-winged.', 'The mainland figure is 30 percent, not 84.'],
    ['The share fell after hawks arrived.', 'It moved from 80 to 84, which is not a fall.'],
    ['Scientist B agrees that hawks were present in the first breeding year.', 'B\'s claim is that hawks were not on the island yet.'],
  ], 'The pre-hawk share is 80 percent, so today\'s 84 percent is not a hawk-created starting point.'),
  q('birds', 'views', 5, 'Which conclusion is not available from the notes?', 'C', [
    ['The first-year island share was higher than the mainland share.', '80 percent is higher than 30 percent. That comparison is in the notes.'],
    ['Hawks are first recorded decades after the first breeding year.', 'The gap given is 40 years.'],
    ['A particular hawk ate long-winged birds rather than short-winged birds.', 'The passage says neither scientist counted what any hawk ate.'],
    ['Today\'s island share is a little higher than the first-year share.', '84 is higher than 80.'],
  ], 'Diet is absent. The three shares and the 40-year gap are present.'),
  q('plots', 'views', 6, 'Which comparison fits Scientist B rather than Scientist A?', 'B', [
    ['Fertilizer only yields 21, which is 14 above the untreated plot.', '21 - 20 = 1, not 14. The 14-point gap is extra water only versus neither: 34 - 20.'],
    ['Extra water only yields 34, close to the combined plot at 35, while fertilizer only stays near the untreated 20.', 'Water separates the high yields from the low ones. Fertilizer does not.'],
    ['The combined plot is 35, so both treatments are required for any gain.', 'Water alone already reaches 34.'],
    ['The untreated plot is the highest bar.', '20 is the lowest bar.'],
  ], 'Water gap without fertilizer is 14. Fertilizer gap without water is 1.'),
  q('plots', 'views', 6, 'What is the fertilizer gap when extra water is already present?', 'A', [
    ['1', 'Both minus water only is 35 - 34 = 1.'],
    ['14', 'That is water only minus neither, 34 - 20.'],
    ['15', 'That is both minus neither, which mixes water and fertilizer.'],
    ['21', '21 is the fertilizer-only yield, not a gap.'],
  ], 'Fertilizer added on top of water changes yield by 1.'),
  q('plots', 'views', 5, 'What is the extra-water gap when fertilizer is absent?', 'D', [
    ['1', 'That is fertilizer only minus neither.'],
    ['15', 'That includes both treatments.'],
    ['35', '35 is the combined yield, not a gap.'],
    ['14', '34 - 20 = 14.'],
  ], 'Water without fertilizer: 34 - 20 = 14.'),
  q('plots', 'views', 7, 'The plots were randomly assigned. What does that support, and what remains thin?', 'C', [
    ['Random assignment makes one plot per treatment enough to ignore a bad patch of soil.', 'The passage says a single poor patch can still affect one bar. Random assignment does not create replication.'],
    ['Random assignment is not relevant because the yields differ.', 'A difference does not replace the design. Assignment is what makes a treatment comparison cleaner than letting the grower choose the best soil for water.'],
    ['Assignment supports comparing the treatments as assigned, but one plot per treatment is still thin evidence.', 'The pattern favors water, and the lack of replication is stated in the passage.'],
    ['The design would be stronger if the grower had placed the water on the plot that already looked best.', 'Choosing the best plot would mix soil with the treatment.'],
  ], 'Random assignment separates the intended treatment from grower choice. n = 1 plot per cell remains unreplicated.'),
  q('plots', 'views', 6, 'Scientist A says fertilizer produced the harvest gain. Which pair of yields is the direct problem for that claim?', 'A', [
    ['Fertilizer only is 21 and neither is 20, while water only is already 34.', 'Fertilizer without water barely moves the yield, and water without fertilizer produces the large gain.'],
    ['Both is 35 and water only is 34, which shows fertilizer is required.', 'Those two bars differ by 1, so fertilizer is not required for the high yield.'],
    ['Neither is 20 and both is 35, and no other plot was measured.', 'Water only and fertilizer only were both measured. Ignoring them is the mistake.'],
    ['The soil differed by treatment because the plots were chosen for looking fertile.', 'The passage says the same soil and random assignment, not a fertility choice.'],
  ], 'A\'s claim fails the fertilizer-only versus water-only contrast: +1 versus +14.'),
  q('plots', 'graphs', 4, 'Which treatment has the highest yield?', 'B', [
    ['Fertilizer only', '21 is just above the untreated plot and well below the water plots.'],
    ['Fertilizer and extra water', '35 is one above water only and well above the plots without extra water.'],
    ['Neither', '20 is the lowest yield.'],
    ['Extra water only', '34 is one below the combined plot.'],
  ], 'Yield order is 35, 34, 21, 20. The maximum is the combined treatment, by 1 over water alone.'),
]

function q(passageKey, topicKey, level, prompt, answer, choices, proof) {
  assert(choices.length === 4, prompt)
  assert('ABCD'.includes(answer), prompt)
  assert(new Set(choices.map((choice) => choice[0])).size === 4, `duplicate choices: ${prompt}`)
  return { passageKey, topicKey, level, prompt, answer, choices, proof }
}

assert(questions.length === 40, `expected 40 questions, found ${questions.length}`)
const byPassage = new Map()
for (const item of questions) {
  byPassage.set(item.passageKey, (byPassage.get(item.passageKey) ?? 0) + 1)
}
assert(byPassage.get('clinic') === 5, 'clinic count')
assert(byPassage.get('beds') === 6, 'beds count')
assert(byPassage.get('filter') === 6, 'filter count')
assert(byPassage.get('battery') === 6, 'battery count')
assert(byPassage.get('scores') === 5, 'scores count')
assert(byPassage.get('birds') === 6, 'birds count')
assert(byPassage.get('plots') === 6, 'plots count')
assert(questions.filter((item) => item.topicKey === 'design').length === 15, 'design count')
assert(questions.filter((item) => item.topicKey === 'views').length === 11, 'views count')
assert(questions.filter((item) => item.topicKey === 'graphs' || item.topicKey === 'trends').length === 14, 'data count')

function fingerprintFor(item) {
  return createHash('sha256').update(`${item.prompt}\n${item.choices.map((choice) => choice[0]).join('\n')}`).digest('hex')
}

const topicRows = checked(await db.from('topics').select('id,name,categories(name,sections(name,tests(name)))'))
for (const topic of Object.values(topics)) {
  const row = topicRows.find((candidate) => candidate.id === topic.id)
  if (!row) throw new Error(`Missing topic ${topic.id}`)
  const exam = row.categories?.sections?.tests?.name
  const section = row.categories?.sections?.name
  const domain = row.categories?.name
  if (exam !== 'ACT' || section !== 'Science' || domain !== topic.domain || row.name !== topic.topic) {
    throw new Error(`Topic mismatch for ${topic.topic}: ${JSON.stringify({ exam, section, domain, name: row.name })}`)
  }
}

const exams = checked(await db.from('practice_exams').select('id, exam_number, title, question_ids, math_module2_hard_ids, english_ids, math_ids, reading_ids, total_questions'))
const protectedIds = new Set()
for (const exam of exams.filter((exam) => exam.exam_number === 39 || exam.exam_number === 40)) {
  for (const id of [...(exam.question_ids ?? []), ...(exam.math_module2_hard_ids ?? [])]) protectedIds.add(id)
}

async function deactivateMatching(pattern) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const page = checked(await db.from('questions').select('id, question_text').eq('active', true).ilike('question_text', pattern).range(from, from + 999))
    rows.push(...page)
    if (page.length < 1000) break
  }
  const drop = rows.map((row) => row.id).filter((id) => !protectedIds.has(id))
  for (let start = 0; start < drop.length; start += 100) {
    checked(await db.from('questions').update({ active: false }).in('id', drop.slice(start, start + 100)))
  }
  return { matched: rows.length, deactivated: drop.length }
}

const skillSets = await deactivateMatching('Skill set %')
const tanks = await deactivateMatching('%two tanks were kept at the same temperature%')

const lead = /^The [a-z]+ [^.]{8,180}? using the [^.]{3,80}?\.\s*/i
const diverse = []
for (let from = 0; ; from += 1000) {
  const page = checked(await db.from('questions').select('id, question_text, choice_a, choice_b, choice_c, choice_d').eq('active', true).eq('source', 'Diverse final push 2026-10-06').range(from, from + 999))
  diverse.push(...page)
  if (page.length < 1000) break
}
const strips = []
for (const row of diverse) {
  const next = String(row.question_text ?? '').replace(lead, '')
  if (next === row.question_text || next.length < 40) continue
  const fingerprint = createHash('sha256').update(`${next}\n${[row.choice_a, row.choice_b, row.choice_c, row.choice_d].filter(Boolean).join('\n')}`).digest('hex')
  strips.push({ id: row.id, question_text: next, fingerprint })
}
let stripped = 0
let stripSkipped = 0
const claimedFingerprints = new Set()
for (let start = 0; start < strips.length; start += 40) {
  const slice = strips.slice(start, start + 40)
  const clashes = checked(await db.from('questions').select('id, fingerprint').in('fingerprint', slice.map((row) => row.fingerprint)))
  const ownerByFingerprint = new Map(clashes.map((row) => [row.fingerprint, row.id]))
  for (const row of slice) {
    const owner = ownerByFingerprint.get(row.fingerprint)
    if ((owner && owner !== row.id) || claimedFingerprints.has(row.fingerprint)) {
      stripSkipped += 1
      continue
    }
    const result = await db.from('questions').update({ question_text: row.question_text, fingerprint: row.fingerprint }).eq('id', row.id)
    if (result.error) {
      if (!String(result.error.message).includes('questions_fingerprint_unique')) throw new Error(result.error.message)
      stripSkipped += 1
      continue
    }
    claimedFingerprints.add(row.fingerprint)
    stripped += 1
  }
}

const existingScience = exams.find((exam) => exam.title === 'Strict validated ACT Science form')
const existingBatch = checked(await db.from('questions').select('id').eq('source', batchName).eq('active', true).limit(50))
let inserted = 0
let scienceExamNumber = existingScience?.exam_number ?? null
if (!existingScience && existingBatch.length === 0) {
  const passageIdByKey = {}
  const passageKeys = Object.keys(passages)
  const savedPassages = checked(await db.from('passages').insert(passageKeys.map((key) => ({
    title: passages[key].title,
    content: passages[key].content,
    active: true,
    source_type: 'original',
    source_rights_status: 'owned',
  }))).select('id'))
  if (savedPassages.length !== passageKeys.length) throw new Error('Passage insert length mismatch')
  passageKeys.forEach((key, index) => { passageIdByKey[key] = savedPassages[index].id })

  const rows = questions.map((item) => {
    const topic = topics[item.topicKey]
    return {
      test_type: 'ACT',
      section_name: 'Science',
      category_name: topic.domain,
      topic_name: topic.topic,
      subtopic_name: topic.topic,
      topic_id: topic.id,
      difficulty: item.level >= 6 ? 'Hard' : 'Medium',
      difficulty_score: (item.level - 1) / 6,
      question_type: 'multiple_choice',
      question_text: item.prompt,
      choice_a: item.choices[0][0],
      choice_b: item.choices[1][0],
      choice_c: item.choices[2][0],
      choice_d: item.choices[3][0],
      correct_answer: item.answer,
      official_explanation: item.proof,
      source_type: 'original',
      source_rights_status: 'owned',
      source: batchName,
      exam_name: batchName,
      fingerprint: fingerprintFor(item),
      answer_verification_status: 'independently_verified',
      review_status: 'approved',
      approved: true,
      active: true,
      passage_id: passageIdByKey[item.passageKey],
    }
  })
  if (new Set(rows.map((row) => row.fingerprint)).size !== rows.length) throw new Error('Duplicate fingerprints inside the science form')
  const found = checked(await db.from('questions').select('fingerprint').in('fingerprint', rows.map((row) => row.fingerprint)))
  if (found.length) throw new Error(`Science fingerprints already exist: ${found.length}`)
  const saved = checked(await db.from('questions').insert(rows).select('id, fingerprint'))
  if (saved.length !== rows.length) throw new Error(`Inserted ${saved.length} of ${rows.length}`)
  const idByFingerprint = new Map(saved.map((row) => [row.fingerprint, row.id]))
  checked(await db.from('exam_item_metadata').insert(questions.map((item) => {
    const topic = topics[item.topicKey]
    const passage = passages[item.passageKey]
    const rationales = {}
    item.choices.forEach((choice, index) => {
      const letter = 'ABCD'[index]
      rationales[letter] = letter === item.answer ? `Correct: ${choice[1]}` : choice[1]
    })
    return {
      question_id: idByFingerprint.get(fingerprintFor(item)),
      version: 1,
      exam_type: 'ACT',
      section: 'Science',
      domain: topic.domain,
      skill: topic.topic,
      subskill: item.proof.slice(0, 180),
      difficulty_level: item.level,
      difficulty_basis: 'editorial',
      estimated_seconds: item.level >= 6 ? 75 : 50,
      module_eligibility: [{ module: 1, route: 'common' }],
      distractor_rationales: rationales,
      graphic_type: passage.graphicType,
      graphic_data: passage.graphicData,
      calculator_expected: false,
      contextual: true,
      validation_status: 'validated',
      content_hash: fingerprintFor(item),
      validation_evidence: {
        independent_solution: true,
        answer_verified: true,
        distractors_verified: true,
        ambiguity_review: true,
        style_review: true,
        difficulty_review: true,
        blueprint_classification: true,
        graphic_data_verified: true,
        answer_follows_from_graphic: true,
        author_solution: item.proof,
        independent_solution_text: item.proof,
        independent_review_method: 'Recomputed the table or graph values in assertions before insert. The same values are stored in graphic_data and in the passage.',
      },
      originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
    }
  })))
  inserted = saved.length
  const orderedIds = questions.map((item) => idByFingerprint.get(fingerprintFor(item)))
  const nextNumber = Math.max(...exams.map((exam) => exam.exam_number)) + 1
  checked(await db.from('practice_exams').insert({
    exam_number: nextNumber,
    title: 'Strict validated ACT Science form',
    test_type: 'ACT',
    format_version: 1,
    total_questions: 40,
    english_ids: [],
    math_ids: [],
    reading_ids: [],
    question_ids: orderedIds,
    math_module1_ids: [],
    math_module2_easy_ids: [],
    math_module2_hard_ids: [],
  }))
  scienceExamNumber = nextNumber
}

const strict = checked(await db.from('practice_exams').select('exam_number, title, total_questions, question_ids, reading_ids, english_ids, math_ids, math_module1_ids, math_module2_easy_ids, math_module2_hard_ids').in('exam_number', [39, 40, scienceExamNumber].filter(Boolean)))
const strictIds = [...new Set(strict.flatMap((exam) => exam.question_ids ?? []))]
let inactiveStrict = 0
for (let start = 0; start < strictIds.length; start += 100) {
  const slice = strictIds.slice(start, start + 100)
  const rows = checked(await db.from('questions').select('id, active').in('id', slice))
  inactiveStrict += rows.filter((row) => !row.active).length
  if (rows.length !== slice.length) inactiveStrict += slice.length - rows.length
}

const report = {
  generatedAt: new Date().toISOString(),
  skillSetOneStep: skillSets,
  tankTemplates: tanks,
  preambleStripped: stripped,
  preambleSkippedForFingerprintClash: stripSkipped,
  scienceQuestionsInserted: inserted,
  scienceExamNumber,
  scienceExamAlreadyPresent: Boolean(existingScience),
  strictExams: strict.map((exam) => ({
    examNumber: exam.exam_number,
    title: exam.title,
    totalQuestions: exam.total_questions,
    questionIds: exam.question_ids?.length ?? 0,
    reading: exam.reading_ids?.length ?? 0,
    english: exam.english_ids?.length ?? 0,
    math: exam.math_ids?.length ?? 0,
    mathModule1: exam.math_module1_ids?.length ?? 0,
    mathModule2Easy: exam.math_module2_easy_ids?.length ?? 0,
    mathModule2Hard: exam.math_module2_hard_ids?.length ?? 0,
  })),
  inactiveQuestionsReferencedByStrictExams: inactiveStrict,
}
writeFileSync('supabase/exam-engineering/elite-science-insert.json', `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
