import {
    assembleSplicedText,
    computeNewCursorPosition,
} from '../../../../client/src/app/features/ai/hooks/useVoiceDictation.js';
import { GeminiLiveTranscriptionProvider } from '../../../../client/src/app/features/ai/services/providers/GeminiLiveTranscriptionProvider.js';

describe('Voice Client Logic & Assembly Suite', () => {
    describe('assembleSplicedText', () => {
        it('should return original text when dictation is empty', () => {
            const result = assembleSplicedText({
                originalText: 'Hello world',
                anchorStart: 5,
                anchorEnd: 5,
                committedTranscript: '',
                interimTranscript: '',
            });
            expect(result).toBe('Hello world');
        });

        it('should append voice dictation at end of existing text with proper spacing', () => {
            const result = assembleSplicedText({
                originalText: 'Hello world',
                anchorStart: 11,
                anchorEnd: 11,
                committedTranscript: 'how are you',
                interimTranscript: '',
            });
            expect(result).toBe('Hello world how are you');
        });

        it('should not add double spaces if original text already ends with a space', () => {
            const result = assembleSplicedText({
                originalText: 'Hello world ',
                anchorStart: 12,
                anchorEnd: 12,
                committedTranscript: 'how are you',
                interimTranscript: '',
            });
            expect(result).toBe('Hello world how are you');
        });

        it('should insert voice dictation at cursor position in middle of text', () => {
            const result = assembleSplicedText({
                originalText: 'The fox jumped',
                anchorStart: 4, // right after "The "
                anchorEnd: 4,
                committedTranscript: 'quick brown',
                interimTranscript: '',
            });
            expect(result).toBe('The quick brown fox jumped');
        });

        it('should replace selection range with voice dictation', () => {
            const result = assembleSplicedText({
                originalText: 'The slow turtle jumped',
                anchorStart: 4,
                anchorEnd: 15, // replaces "slow turtle"
                committedTranscript: 'fast cheetah',
                interimTranscript: '',
            });
            expect(result).toBe('The fast cheetah jumped');
        });

        it('should show interim preview dynamically combined with committed text', () => {
            const result = assembleSplicedText({
                originalText: '',
                anchorStart: 0,
                anchorEnd: 0,
                committedTranscript: 'Hello world',
                interimTranscript: 'this is a test',
            });
            expect(result).toBe('Hello world this is a test');
        });
    });

    describe('computeNewCursorPosition', () => {
        it('should calculate cursor position at end of inserted dictation', () => {
            const pos = computeNewCursorPosition({
                originalText: 'Hello',
                anchorStart: 5,
                committedTranscript: 'world',
            });
            // 'Hello' (5) + ' ' (1) + 'world' (5) = 11
            expect(pos).toBe(11);
        });

        it('should handle cursor position from empty composer', () => {
            const pos = computeNewCursorPosition({
                originalText: '',
                anchorStart: 0,
                committedTranscript: 'Hello',
            });
            // '' (0) + '' (0) + 'Hello' (5) = 5
            expect(pos).toBe(5);
        });
    });

    describe('GeminiLiveTranscriptionProvider Server Message Parsing', () => {
        it('should correctly parse camelCase interimInputTranscription and inputTranscription', () => {
            const provider = new GeminiLiveTranscriptionProvider();
            const interims = [];
            const finals = [];

            provider.callbacks = {
                onInterim: (text) => interims.push(text),
                onFinal: (text) => finals.push(text),
            };

            // 1. Emulate interim server message
            provider._handleServerMessage({
                serverContent: {
                    interimInputTranscription: {
                        text: 'Testing interim speech',
                    },
                },
            });

            expect(interims).toEqual(['Testing interim speech']);
            expect(finals).toEqual([]);

            // 2. Emulate final server message
            provider._handleServerMessage({
                serverContent: {
                    inputTranscription: {
                        text: 'Testing interim speech completed.',
                    },
                },
            });

            expect(finals).toEqual(['Testing interim speech completed.']);
        });

        it('should support snake_case transcription fields as resilient fallback', () => {
            const provider = new GeminiLiveTranscriptionProvider();
            const interims = [];
            const finals = [];

            provider.callbacks = {
                onInterim: (text) => interims.push(text),
                onFinal: (text) => finals.push(text),
            };

            provider._handleServerMessage({
                serverContent: {
                    interim_input_transcription: {
                        text: 'snake_case interim',
                    },
                },
            });

            provider._handleServerMessage({
                serverContent: {
                    input_transcription: {
                        text: 'snake_case final',
                    },
                },
            });

            expect(interims).toEqual(['snake_case interim']);
            expect(finals).toEqual(['snake_case final']);
        });

        it('should ignore unrelated server messages gracefully', () => {
            const provider = new GeminiLiveTranscriptionProvider();
            let called = false;
            provider.callbacks = {
                onInterim: () => {
                    called = true;
                },
                onFinal: () => {
                    called = true;
                },
            };

            provider._handleServerMessage(null);
            provider._handleServerMessage({});
            provider._handleServerMessage({ serverContent: {} });

            expect(called).toBe(false);
        });
    });
});
