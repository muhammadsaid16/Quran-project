//#region src/tokens.d.ts
/** A recognized token and the time of the audio that produced it. */
interface TimedToken {
  /** The token as the model's vocabulary writes it, often with a leading space. `joinTokens` turns tokens into text. */
  text: string;
  /**
   * Seconds from the first accepted sample to the frame that emitted the token. The token comes
   * after its speech. With X-ASR, the delay was 0.05-0.5 s. Other models can have a different delay.
   */
  time: number;
}
/** True when a token holds only punctuation and spaces, by the rule that `joinTokens` uses. */
declare function isPunctuationToken(token: string): boolean;
/**
 * The text of transducer tokens, built as sherpa-onnx builds its result text. The function
 * concatenates the tokens, with `<0xNN>` tokens as raw bytes, and removes each space between two
 * CJK characters or before punctuation. It also trims the result.
 *
 * sherpa-onnx decodes the text of a byte-level BPE model with one more table. This function does not
 * use that table. It gives wrong text for such a model. For a CTC model, sherpa-onnx keeps the
 * spaces between CJK characters. The two texts can then differ in spaces.
 */
declare function joinTokens(tokens: readonly string[]): string;
/** Puts timed tokens back on the timeline of a session that the recognizer heard in parts. */
interface TokenTimeline {
  /**
   * The recognizer heard `length` samples of session audio from position `at` on, as its samples
   * from `from` on. Call in the recognizer's order. Silence between the calls has no position.
   */
  hear: (at: number, from: number, length: number) => void;
  /** Starts a new session. Tokens of earlier sessions go to no row. */
  reset: () => void;
  /**
   * The words of each row, and the words from `liveFrom` on. `rowStarts` holds the session position
   * where each row starts, in order. Tokens before the first row are left out.
   */
  place: (tokens: readonly TimedToken[], rowStarts: readonly number[], liveFrom?: number) => {
    rows: string[];
    live: string;
  };
}
/**
 * Maps the recognizer's time back to session positions, so that each token goes to the row whose
 * audio produced it. Use it when the recognizer hears only parts of a session, for example the
 * speech of a conversation. A row can be a speaker turn. Positions and lengths count samples.
 *
 * A token comes after its speech. The timeline moves each token's time back by `lagSeconds`. The
 * value 0.2 s fits X-ASR. Measure the delay for another model. A token in the silence after a span
 * belongs to that span. A pause therefore keeps a late token in its row. Inside a span, a token
 * that comes more than `lagSeconds` after its speech can go to the next row. Each token goes to a
 * row by its own time. A cut inside a word of several tokens therefore splits the word between two
 * rows.
 */
declare function createTokenTimeline(sampleRate: number, lagSeconds: number): TokenTimeline;
//#endregion
export { joinTokens as a, isPunctuationToken as i, TokenTimeline as n, createTokenTimeline as r, TimedToken as t };