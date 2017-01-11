/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as assert from 'assert';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { TextModel } from 'vs/editor/common/model/textModel';
import { TextModelSearch, SearchParams } from 'vs/editor/common/model/textModelSearch';

// --------- Find
suite('TextModelSearch', () => {

	function toArrRange(r: Range): [number, number, number, number] {
		return [r.startLineNumber, r.startColumn, r.endLineNumber, r.endColumn];
	}

	function assertFindMatches(text: string, searchString: string, isRegex: boolean, matchCase: boolean, wholeWord: boolean, expected: [number, number, number, number][]): void {
		let model = new TextModel([], TextModel.toRawText(text, TextModel.DEFAULT_CREATION_OPTIONS));

		let actualRanges = model.findMatches(searchString, false, isRegex, matchCase, wholeWord);
		let actual = actualRanges.map(toArrRange);

		assert.deepEqual(actual, expected, 'findMatches OK');

		// test `findNextMatch`
		let startPos = new Position(1, 1);
		let match = TextModelSearch.findNextMatch(model, new SearchParams(searchString, isRegex, matchCase, wholeWord), startPos);
		assert.deepEqual(toArrRange(match), expected[0], `findNextMatch ${startPos}`);
		for (let i = 0; i < expected.length; i++) {
			startPos = new Position(expected[i][0], expected[i][1]);
			match = TextModelSearch.findNextMatch(model, new SearchParams(searchString, isRegex, matchCase, wholeWord), startPos);
			assert.deepEqual(toArrRange(match), expected[i], `findNextMatch ${startPos}`);
		}

		// test `findPrevMatch`
		startPos = new Position(model.getLineCount(), model.getLineMaxColumn(model.getLineCount()));
		match = TextModelSearch.findPreviousMatch(model, new SearchParams(searchString, isRegex, matchCase, wholeWord), startPos);
		assert.deepEqual(toArrRange(match), expected[expected.length - 1], `findPrevMatch ${startPos}`);
		for (let i = 0; i < expected.length; i++) {
			startPos = new Position(expected[i][2], expected[i][3]);
			match = TextModelSearch.findPreviousMatch(model, new SearchParams(searchString, isRegex, matchCase, wholeWord), startPos);
			assert.deepEqual(toArrRange(match), expected[i], `findPrevMatch ${startPos}`);
		}

		model.dispose();
	}

	let regularText = [
		'This is some foo - bar text which contains foo and bar - as in Barcelona.',
		'Now it begins a word fooBar and now it is caps Foo-isn\'t this great?',
		'And here\'s a dull line with nothing interesting in it',
		'It is also interesting if it\'s part of a word like amazingFooBar',
		'Again nothing interesting here'
	];

	test('Simple find', () => {
		assertFindMatches(
			regularText.join('\n'),
			'foo', false, false, false,
			[
				[1, 14, 1, 17],
				[1, 44, 1, 47],
				[2, 22, 2, 25],
				[2, 48, 2, 51],
				[4, 59, 4, 62]
			]
		);
	});

	test('Case sensitive find', () => {
		assertFindMatches(
			regularText.join('\n'),
			'foo', false, true, false,
			[
				[1, 14, 1, 17],
				[1, 44, 1, 47],
				[2, 22, 2, 25]
			]
		);
	});

	test('Whole words find', () => {
		assertFindMatches(
			regularText.join('\n'),
			'foo', false, false, true,
			[
				[1, 14, 1, 17],
				[1, 44, 1, 47],
				[2, 48, 2, 51]
			]
		);
	});

	test('/^/ find', () => {
		assertFindMatches(
			regularText.join('\n'),
			'^', true, false, false,
			[
				[1, 1, 1, 1],
				[2, 1, 2, 1],
				[3, 1, 3, 1],
				[4, 1, 4, 1],
				[5, 1, 5, 1]
			]
		);
	});

	test('/$/ find', () => {
		assertFindMatches(
			regularText.join('\n'),
			'$', true, false, false,
			[
				[1, 74, 1, 74],
				[2, 69, 2, 69],
				[3, 54, 3, 54],
				[4, 65, 4, 65],
				[5, 31, 5, 31]
			]
		);
	});

	test('/.*/ find', () => {
		assertFindMatches(
			regularText.join('\n'),
			'.*', true, false, false,
			[
				[1, 1, 1, 74],
				[2, 1, 2, 69],
				[3, 1, 3, 54],
				[4, 1, 4, 65],
				[5, 1, 5, 31]
			]
		);
	});

	test('/^$/ find', () => {
		assertFindMatches(
			[
				'This is some foo - bar text which contains foo and bar - as in Barcelona.',
				'',
				'And here\'s a dull line with nothing interesting in it',
				'',
				'Again nothing interesting here'
			].join('\n'),
			'^$', true, false, false,
			[
				[2, 1, 2, 1],
				[4, 1, 4, 1]
			]
		);
	});

	test('multiline find 1', () => {
		assertFindMatches(
			[
				'Just some text text',
				'Just some text text',
				'some text again',
				'again some text'
			].join('\n'),
			'text\\n', true, false, false,
			[
				[1, 16, 2, 1],
				[2, 16, 3, 1],
			]
		);
	});

	test('multiline find 2', () => {
		assertFindMatches(
			[
				'Just some text text',
				'Just some text text',
				'some text again',
				'again some text'
			].join('\n'),
			'text\\nJust', true, false, false,
			[
				[1, 16, 2, 5]
			]
		);
	});

	test('multiline find 3', () => {
		assertFindMatches(
			[
				'Just some text text',
				'Just some text text',
				'some text again',
				'again some text'
			].join('\n'),
			'\\nagain', true, false, false,
			[
				[3, 16, 4, 6]
			]
		);
	});

	test('multiline find 4', () => {
		assertFindMatches(
			[
				'Just some text text',
				'Just some text text',
				'some text again',
				'again some text'
			].join('\n'),
			'.*\\nJust.*\\n', true, false, false,
			[
				[1, 1, 3, 1]
			]
		);
	});

	test('multiline find with line beginning regex', () => {
		assertFindMatches(
			[
				'if',
				'else',
				'',
				'if',
				'else'
			].join('\n'),
			'^if\\nelse', true, false, false,
			[
				[1, 1, 2, 5],
				[4, 1, 5, 5]
			]
		);
	});

	test('matching empty lines using boundary expression', () => {
		assertFindMatches(
			[
				'if',
				'',
				'else',
				'  ',
				'if',
				' ',
				'else'
			].join('\n'),
			'^\\s*$\\n', true, false, false,
			[
				[2, 1, 3, 1],
				[4, 1, 5, 1],
				[6, 1, 7, 1]
			]
		);
	});

	test('matching lines starting with A and ending with B', () => {
		assertFindMatches(
			[
				'a if b',
				'a',
				'ab',
				'eb'
			].join('\n'),
			'^a.*b$', true, false, false,
			[
				[1, 1, 1, 7],
				[3, 1, 3, 3]
			]
		);
	});

	test('multiline find with line ending regex', () => {
		assertFindMatches(
			[
				'if',
				'else',
				'',
				'if',
				'elseif',
				'else'
			].join('\n'),
			'if\\nelse$', true, false, false,
			[
				[1, 1, 2, 5],
				[5, 5, 6, 5]
			]
		);
	});

	test('issue #4836 - ^.*$', () => {
		assertFindMatches(
			[
				'Just some text text',
				'',
				'some text again',
				'',
				'again some text'
			].join('\n'),
			'^.*$', true, false, false,
			[
				[1, 1, 1, 20],
				[2, 1, 2, 1],
				[3, 1, 3, 16],
				[4, 1, 4, 1],
				[5, 1, 5, 16],
			]
		);
	});

	test('multiline find for non-regex string', () => {
		assertFindMatches(
			[
				'Just some text text',
				'some text text',
				'some text again',
				'again some text',
				'but not some'
			].join('\n'),
			'text\nsome', false, false, false,
			[
				[1, 16, 2, 5],
				[2, 11, 3, 5],
			]
		);
	});

	test('findNextMatch without regex', () => {
		let model = new TextModel([], TextModel.toRawText('line line one\nline two\nthree', TextModel.DEFAULT_CREATION_OPTIONS));

		let searchParams = new SearchParams('line', false, false, false);

		let actual = TextModelSearch.findNextMatch(model, searchParams, { lineNumber: 1, column: 1 });
		assert.equal(new Range(1, 1, 1, 5).toString(), actual.toString());

		actual = TextModelSearch.findNextMatch(model, searchParams, actual.getEndPosition());
		assert.equal(new Range(1, 6, 1, 10).toString(), actual.toString());

		actual = TextModelSearch.findNextMatch(model, searchParams, { lineNumber: 1, column: 3 });
		assert.equal(new Range(1, 6, 1, 10).toString(), actual.toString());

		actual = TextModelSearch.findNextMatch(model, searchParams, actual.getEndPosition());
		assert.equal(new Range(2, 1, 2, 5).toString(), actual.toString());

		actual = TextModelSearch.findNextMatch(model, searchParams, actual.getEndPosition());
		assert.equal(new Range(1, 1, 1, 5).toString(), actual.toString());

		model.dispose();
	});

	test('findNextMatch with beginning boundary regex', () => {
		let model = new TextModel([], TextModel.toRawText('line one\nline two\nthree', TextModel.DEFAULT_CREATION_OPTIONS));

		let searchParams = new SearchParams('^line', true, false, false);

		let actual = TextModelSearch.findNextMatch(model, searchParams, { lineNumber: 1, column: 1 });
		assert.equal(new Range(1, 1, 1, 5).toString(), actual.toString());

		actual = TextModelSearch.findNextMatch(model, searchParams, actual.getEndPosition());
		assert.equal(new Range(2, 1, 2, 5).toString(), actual.toString());

		actual = TextModelSearch.findNextMatch(model, searchParams, { lineNumber: 1, column: 3 });
		assert.equal(new Range(2, 1, 2, 5).toString(), actual.toString());

		actual = TextModelSearch.findNextMatch(model, searchParams, actual.getEndPosition());
		assert.equal(new Range(1, 1, 1, 5).toString(), actual.toString());

		model.dispose();
	});

	test('findNextMatch with beginning boundary regex and line has repetitive beginnings', () => {
		let model = new TextModel([], TextModel.toRawText('line line one\nline two\nthree', TextModel.DEFAULT_CREATION_OPTIONS));

		let searchParams = new SearchParams('^line', true, false, false);

		let actual = TextModelSearch.findNextMatch(model, searchParams, { lineNumber: 1, column: 1 });
		assert.equal(new Range(1, 1, 1, 5).toString(), actual.toString());

		actual = TextModelSearch.findNextMatch(model, searchParams, actual.getEndPosition());
		assert.equal(new Range(2, 1, 2, 5).toString(), actual.toString());

		actual = TextModelSearch.findNextMatch(model, searchParams, { lineNumber: 1, column: 3 });
		assert.equal(new Range(2, 1, 2, 5).toString(), actual.toString());

		actual = TextModelSearch.findNextMatch(model, searchParams, actual.getEndPosition());
		assert.equal(new Range(1, 1, 1, 5).toString(), actual.toString());

		model.dispose();
	});

	test('findNextMatch with beginning boundary multiline regex and line has repetitive beginnings', () => {
		let model = new TextModel([], TextModel.toRawText('line line one\nline two\nline three\nline four', TextModel.DEFAULT_CREATION_OPTIONS));

		let searchParams = new SearchParams('^line.*\\nline', true, false, false);

		let actual = TextModelSearch.findNextMatch(model, searchParams, { lineNumber: 1, column: 1 });
		assert.equal(new Range(1, 1, 2, 5).toString(), actual.toString());

		actual = TextModelSearch.findNextMatch(model, searchParams, actual.getEndPosition());
		assert.equal(new Range(3, 1, 4, 5).toString(), actual.toString());

		actual = TextModelSearch.findNextMatch(model, searchParams, { lineNumber: 2, column: 1 });
		assert.equal(new Range(2, 1, 3, 5).toString(), actual.toString());

		model.dispose();
	});

	test('findNextMatch with ending boundary regex', () => {
		let model = new TextModel([], TextModel.toRawText('one line line\ntwo line\nthree', TextModel.DEFAULT_CREATION_OPTIONS));

		let searchParams = new SearchParams('line$', true, false, false);

		let actual = TextModelSearch.findNextMatch(model, searchParams, { lineNumber: 1, column: 1 });
		assert.equal(new Range(1, 10, 1, 14).toString(), actual.toString());

		actual = TextModelSearch.findNextMatch(model, searchParams, { lineNumber: 1, column: 4 });
		assert.equal(new Range(1, 10, 1, 14).toString(), actual.toString());

		actual = TextModelSearch.findNextMatch(model, searchParams, actual.getEndPosition());
		assert.equal(new Range(2, 5, 2, 9).toString(), actual.toString());

		actual = TextModelSearch.findNextMatch(model, searchParams, actual.getEndPosition());
		assert.equal(new Range(1, 10, 1, 14).toString(), actual.toString());

		model.dispose();
	});

	function assertParseSearchResult(searchString: string, isRegex: boolean, matchCase: boolean, wholeWord: boolean, expected: RegExp): void {
		let searchParams = new SearchParams(searchString, isRegex, matchCase, wholeWord);
		let actual = searchParams.parseSearchRequest();
		assert.deepEqual(actual, expected);
	}

	test('parseSearchRequest invalid', () => {
		assertParseSearchResult('', true, true, true, null);
		assertParseSearchResult(null, true, true, true, null);
		assertParseSearchResult('(', true, false, false, null);
	});

	test('parseSearchRequest non regex', () => {
		assertParseSearchResult('foo', false, false, false, /foo/gi);
		assertParseSearchResult('foo', false, false, true, /\bfoo\b/gi);
		assertParseSearchResult('foo', false, true, false, /foo/g);
		assertParseSearchResult('foo', false, true, true, /\bfoo\b/g);
		assertParseSearchResult('foo\\n', false, false, false, /foo\\n/gi);
		assertParseSearchResult('foo\\\\n', false, false, false, /foo\\\\n/gi);
		assertParseSearchResult('foo\\r', false, false, false, /foo\\r/gi);
		assertParseSearchResult('foo\\\\r', false, false, false, /foo\\\\r/gi);
	});

	test('parseSearchRequest regex', () => {
		assertParseSearchResult('foo', true, false, false, /foo/gi);
		assertParseSearchResult('foo', true, false, true, /\bfoo\b/gi);
		assertParseSearchResult('foo', true, true, false, /foo/g);
		assertParseSearchResult('foo', true, true, true, /\bfoo\b/g);
		assertParseSearchResult('foo\\n', true, false, false, /foo\n/gim);
		assertParseSearchResult('foo\\\\n', true, false, false, /foo\\n/gi);
		assertParseSearchResult('foo\\r', true, false, false, /foo\r/gim);
		assertParseSearchResult('foo\\\\r', true, false, false, /foo\\r/gi);
	});
});