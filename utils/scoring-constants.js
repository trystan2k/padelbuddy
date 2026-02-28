/**
 * @typedef {0 | 15 | 30 | 40 | 'Ad' | 'Game'} ScorePoint
 */

/**
 * Standard point values for padel/tennis scoring.
 */
export const SCORE_POINTS = Object.freeze({
  LOVE: 0,
  FIFTEEN: 15,
  THIRTY: 30,
  FORTY: 40,
  ADVANTAGE: 'Ad',
  GAME: 'Game'
})

/**
 * Ordered progression used by score transition logic.
 */
export const SCORE_POINT_SEQUENCE = Object.freeze([
  SCORE_POINTS.LOVE,
  SCORE_POINTS.FIFTEEN,
  SCORE_POINTS.THIRTY,
  SCORE_POINTS.FORTY,
  SCORE_POINTS.ADVANTAGE,
  SCORE_POINTS.GAME
])
