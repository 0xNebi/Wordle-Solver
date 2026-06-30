import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sun, Moon, Lightbulb, RefreshCw, Loader2, Delete, Compass, Target, Sparkles, Palette } from 'lucide-react';
import { computeFeedback, findWordsForPattern, type PatternState } from './wordle';

type CellState = 'tbd' | 'absent' | 'present' | 'correct';
type PaintState = 'blank' | 'absent' | 'present' | 'correct' | 'any';
type AppMode = 'solve' | 'explore' | 'draw';

interface DrawRowResult {
  row: number;
  words: string[];
  selected: string;
}

interface Cell {
  letter: string;
  state: CellState;
}

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
];

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [words, setWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [wordLength, setWordLength] = useState<number>(5);
  const maxGuesses = 6;

  const createEmptyGrid = (len: number) => 
    Array.from({ length: maxGuesses }, () => 
      Array.from({ length: len }, () => ({ letter: '', state: 'tbd' as CellState }))
    );

  const [grid, setGrid] = useState<Cell[][]>(createEmptyGrid(5));
  const rowIds = useRef<string[]>(Array.from({ length: maxGuesses }, () => crypto.randomUUID()));
  const [currentRow, setCurrentRow] = useState(0);
  const [currentCol, setCurrentCol] = useState(0);

  const [filteredWords, setFilteredWords] = useState<string[] | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [appMode, setAppMode] = useState<AppMode>('solve');

  const createBlankDrawPattern = (len: number) =>
    Array.from({ length: maxGuesses }, () =>
      Array.from({ length: len }, () => 'blank' as PaintState)
    );

  const [solutionWord, setSolutionWord] = useState('');
  const [drawPattern, setDrawPattern] = useState<PaintState[][]>(createBlankDrawPattern(5));
  const [drawResults, setDrawResults] = useState<DrawRowResult[] | null>(null);
  const [drawError, setDrawError] = useState('');
  const [drawWarning, setDrawWarning] = useState('');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt')
      .then(res => res.text())
      .then(text => {
        setWords(text.split('\n').map(w => w.trim().toUpperCase()).filter(w => w.length > 0));
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch words', err);
        setLoading(false);
      });
  }, []);

  const handleLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseInt(e.target.value, 10);
    if (Number.isNaN(val) || val < 2 || val > 15) return;
    setWordLength(val);
    setGrid(createEmptyGrid(val));
    setDrawPattern(createBlankDrawPattern(val));
    setCurrentRow(0);
    setCurrentCol(0);
    setFilteredWords(null);
    setSuggestion('');
    setDrawResults(null);
    setDrawError('');
    setDrawWarning('');
  };

  const getFiltered = useCallback((currentGrid: Cell[][]) => {
    let currentWords = words.filter(w => w.length === wordLength);

    const excl = new Set<string>();
    const incl = new Set<string>();
    const green = new Array(wordLength).fill('');
    const yellow = Array.from({ length: wordLength }, () => new Set<string>());

    currentGrid.forEach(row => {
      row.forEach((cell, i) => {
        if (cell.state === 'correct') {
          green[i] = cell.letter;
          incl.add(cell.letter);
        } else if (cell.state === 'present') {
          yellow[i].add(cell.letter);
          incl.add(cell.letter);
        }
      });
    });

    currentGrid.forEach(row => {
      row.forEach((cell, i) => {
        if (cell.state === 'absent') {
          if (incl.has(cell.letter)) {
            yellow[i].add(cell.letter);
          } else {
            excl.add(cell.letter);
          }
        }
      });
    });

    if (excl.size > 0) {
      currentWords = currentWords.filter(w => {
        for (const ch of w) {
          if (excl.has(ch)) return false;
        }
        return true;
      });
    }

    if (incl.size > 0) {
      currentWords = currentWords.filter(w => {
        for (const ch of incl) {
          if (!w.includes(ch)) return false;
        }
        return true;
      });
    }

    for (let i = 0; i < wordLength; i++) {
      if (green[i]) {
        currentWords = currentWords.filter(w => w[i] === green[i]);
      }
    }

    for (let i = 0; i < wordLength; i++) {
      if (yellow[i].size > 0) {
        currentWords = currentWords.filter(w => {
          for (const ch of yellow[i]) {
            if (w[i] === ch) return false;
          }
          return true;
        });
      }
    }

    return currentWords;
  }, [wordLength, words]);

  const generateSuggestion = useCallback((solveWords: string[], isExplore: boolean, currentGrid: Cell[][]) => {
    let candidatesList = solveWords;

    if (isExplore) {
      const usedLetters = new Set<string>();
      currentGrid.forEach(row => row.forEach(cell => {
        if (cell.state !== 'tbd' && cell.letter) usedLetters.add(cell.letter);
      }));

      let allWords = words.filter(w => w.length === wordLength);
      let exploreCandidates = allWords.filter(w => {
        for (const ch of w) {
          if (usedLetters.has(ch)) return false;
        }
        return true;
      });

      if (exploreCandidates.length === 0) {
        const absentLetters = new Set<string>();
        currentGrid.forEach(row => row.forEach(cell => {
          if (cell.state === 'absent' && cell.letter) absentLetters.add(cell.letter);
        }));
        exploreCandidates = allWords.filter(w => {
          for (const ch of w) {
            if (absentLetters.has(ch)) return false;
          }
          return true;
        });
      }
      
      if (exploreCandidates.length > 0) {
        candidatesList = exploreCandidates;
      }
    }

    if (!candidatesList || candidatesList.length === 0) {
      setSuggestion('No words found');
      return;
    }

    let maxUnique = 0;
    candidatesList.forEach(w => {
      const unique = new Set(w).size;
      if (unique > maxUnique) maxUnique = unique;
    });

    const bestCandidates = candidatesList.filter(w => new Set(w).size === maxUnique);
    const best = bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
    setSuggestion(best);
  }, [words, wordLength]);

  useEffect(() => {
    if (words.length > 0 && appMode !== 'draw') {
      const res = getFiltered(grid);
      setFilteredWords(res);
      generateSuggestion(res, appMode === 'explore', grid);
    }
  }, [grid, appMode, words, getFiltered, generateSuggestion]);

  const handleSuggestClick = () => {
    if (filteredWords !== null) {
      generateSuggestion(filteredWords, appMode === 'explore', grid);
    }
  };

  const toggleDrawCell = (r: number, c: number) => {
    const nextState: Record<PaintState, PaintState> = {
      blank: 'correct',
      correct: 'present',
      present: 'any',
      any: 'absent',
      absent: 'blank',
    };
    const newPattern = drawPattern.map((row, ri) =>
      ri === r ? row.map((cell, ci) => (ci === c ? nextState[cell] : cell)) : row
    );
    setDrawPattern(newPattern);
    setDrawResults(null);
    setDrawError('');
    setDrawWarning('');
  };

  const generateDrawWords = () => {
    const target = solutionWord.trim().toUpperCase();
    if (target.length !== wordLength) {
      setDrawError(`Enter a ${wordLength}-letter solution word.`);
      setDrawResults(null);
      setDrawWarning('');
      return;
    }
    if (!/^[A-Z]+$/.test(target)) {
      setDrawError('Solution word must contain only letters.');
      setDrawResults(null);
      setDrawWarning('');
      return;
    }

    const dictionary = words.filter((w) => w.length === wordLength);
    const results: DrawRowResult[] = [];

    for (let r = 0; r < maxGuesses; r++) {
      const row = drawPattern[r];
      const hasPaint = row.some((cell) => cell !== 'blank');
      if (!hasPaint) continue;

      const pattern: PatternState[] = row.map((cell) => (cell === 'blank' ? 'absent' : cell));
      const matches = findWordsForPattern(pattern, target, dictionary);
      results.push({
        row: r,
        words: matches,
        selected: matches[0] ?? '',
      });
    }

    if (results.length === 0) {
      setDrawError('Paint at least one row to generate words.');
      setDrawResults(null);
      setDrawWarning('');
      return;
    }

    const paintedRows = drawPattern
      .map((row, i) => (row.some((cell) => cell !== 'blank') ? i : -1))
      .filter((i) => i >= 0);
    const firstPainted = paintedRows[0];
    const lastPainted = paintedRows[paintedRows.length - 1];
    const gapCount = paintedRows.length > 0
      ? lastPainted - firstPainted + 1 - paintedRows.length
      : 0;

    setDrawError('');
    setDrawWarning(
      gapCount > 0
        ? `Rows ${firstPainted + 1}–${lastPainted + 1} must all be played in order — paint any skipped rows too.`
        : ''
    );
    setDrawResults(results);
  };

  const selectDrawWord = (row: number, word: string) => {
    setDrawResults((prev) =>
      prev?.map((result) => (result.row === row ? { ...result, selected: word } : result)) ?? null
    );
  };

  const handleDrawReset = () => {
    setDrawPattern(createBlankDrawPattern(wordLength));
    setSolutionWord('');
    setDrawResults(null);
    setDrawError('');
    setDrawWarning('');
  };

  const onKeyPress = useCallback((key: string) => {
    if (key === 'BACKSPACE') {
      if (currentCol > 0) {
        const newGrid = [...grid];
        newGrid[currentRow] = [...newGrid[currentRow]];
        newGrid[currentRow][currentCol - 1] = { letter: '', state: 'tbd' };
        setGrid(newGrid);
        setCurrentCol(currentCol - 1);
      }
    } else if (key === 'ENTER') {
      if (currentCol === wordLength) {
        const newGrid = [...grid];
        newGrid[currentRow] = [...newGrid[currentRow]];
        let changed = false;
        newGrid[currentRow].forEach((cell, idx) => {
          if (cell.state === 'tbd') {
            newGrid[currentRow][idx] = { ...cell, state: 'absent' };
            changed = true;
          }
        });
        if (changed) setGrid(newGrid);
        
        if (currentRow < maxGuesses - 1) {
          setCurrentRow(currentRow + 1);
          setCurrentCol(0);
        }
      }
    } else if (currentCol < wordLength && currentRow < maxGuesses) {
      const newGrid = [...grid];
      newGrid[currentRow] = [...newGrid[currentRow]];
      newGrid[currentRow][currentCol] = { letter: key, state: 'tbd' };
      setGrid(newGrid);
      setCurrentCol(currentCol + 1);
    }
  }, [currentCol, currentRow, grid, wordLength, maxGuesses]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (appMode === 'draw') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Backspace') {
        onKeyPress('BACKSPACE');
      } else if (e.key === 'Enter') {
        onKeyPress('ENTER');
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        onKeyPress(e.key.toUpperCase());
      }
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [onKeyPress, appMode]);

  const toggleCellState = (r: number, c: number) => {
    if (r > currentRow || (r === currentRow && c >= currentCol)) return;
    
    const newGrid = [...grid];
    newGrid[r] = [...newGrid[r]];
    const cell = newGrid[r][c];
    
    const nextState: Record<CellState, CellState> = {
      'tbd': 'absent',
      'absent': 'present',
      'present': 'correct',
      'correct': 'absent'
    };
    
    newGrid[r][c] = { ...cell, state: nextState[cell.state] };
    setGrid(newGrid);
  };

  const handleReset = () => {
    setGrid(createEmptyGrid(wordLength));
    setCurrentRow(0);
    setCurrentCol(0);
    setFilteredWords(null);
    setSuggestion('');
  };

  const keyColors: Record<string, CellState> = {};
  grid.forEach(row => {
    row.forEach(cell => {
      if (!cell.letter || cell.state === 'tbd') return;
      const current = keyColors[cell.letter];
      if (cell.state === 'correct') {
        keyColors[cell.letter] = 'correct';
      } else if (cell.state === 'present' && current !== 'correct') {
        keyColors[cell.letter] = 'present';
      } else if (cell.state === 'absent' && current !== 'correct' && current !== 'present') {
        keyColors[cell.letter] = 'absent';
      }
    });
  });

  const getBgColor = (state: CellState | PaintState, isDark: boolean) => {
    switch (state) {
      case 'correct': return 'bg-emerald-500 text-white border-emerald-500';
      case 'present': return 'bg-amber-500 text-white border-amber-500';
      case 'absent': return isDark ? 'bg-zinc-700 text-white border-zinc-700' : 'bg-zinc-500 text-white border-zinc-500';
      case 'any': return 'bg-violet-500 text-white border-violet-500';
      case 'blank': return isDark ? 'bg-zinc-800/50 text-zinc-500 border-zinc-600 border-dashed' : 'bg-zinc-100 text-zinc-400 border-zinc-300 border-dashed';
      case 'tbd': return isDark ? 'bg-zinc-800 text-zinc-100 border-zinc-600' : 'bg-white text-zinc-900 border-zinc-300';
    }
  };

  const getDrawCellDisplay = (row: number, col: number, paint: PaintState): { color: CellState | PaintState; letter: string } => {
    const result = drawResults?.find((r) => r.row === row);
    const letter = result?.selected?.[col] ?? '';
    if (result?.selected && paint === 'any') {
      const feedback = computeFeedback(result.selected, solutionWord.toUpperCase());
      return { color: feedback[col], letter };
    }
    return { color: paint, letter };
  };

  const getKeyBgColor = (state: CellState | undefined, isDark: boolean) => {
    switch (state) {
      case 'correct': return 'bg-emerald-500 text-white';
      case 'present': return 'bg-amber-500 text-white';
      case 'absent': return isDark ? 'bg-zinc-800 text-zinc-500 opacity-50' : 'bg-zinc-300 text-zinc-500 opacity-50';
      default: return isDark ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-200 text-zinc-900';
    }
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-200 flex flex-col">
        <header className="p-4 flex justify-between items-center max-w-lg mx-auto w-full border-b border-zinc-200 dark:border-zinc-800">
          <h1 className="text-2xl font-bold tracking-tight">Wordle Solver</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="word-length" className="text-sm font-medium text-zinc-500">Length:</label>
              <input 
                id="word-length"
                type="number" 
                min={2} max={15} 
                value={wordLength} 
                onChange={handleLengthChange}
                className="w-16 p-1 text-center rounded bg-zinc-200 dark:bg-zinc-800 border border-transparent focus:border-emerald-500 outline-none"
              />
            </div>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col max-w-lg mx-auto w-full p-4 gap-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 flex-1">
              <Loader2 className="animate-spin text-emerald-500" size={40} />
              <p className="text-zinc-500 dark:text-zinc-400">Loading dictionary...</p>
            </div>
          ) : (
            <>
              {appMode === 'draw' && (
                <div className="w-full max-w-md mx-auto space-y-2">
                  <label htmlFor="solution-word" className="block text-sm font-medium text-zinc-500">
                    Solution word (the answer you already know)
                  </label>
                  <input
                    id="solution-word"
                    type="text"
                    value={solutionWord}
                    onChange={(e) => {
                      setSolutionWord(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, wordLength));
                      setDrawResults(null);
                      setDrawError('');
                      setDrawWarning('');
                    }}
                    placeholder={`${wordLength}-letter word`}
                    className="w-full p-3 text-center text-xl font-bold tracking-widest uppercase rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-emerald-500 outline-none"
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                    Click tiles to paint: green → yellow → any → gray → clear
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                    <span className="inline-block w-3 h-3 rounded-sm bg-violet-500 align-middle mr-1" />
                    Any = green or yellow (more word options)
                  </p>
                </div>
              )}

              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                {appMode === 'draw'
                  ? drawPattern.map((row, rIndex) => (
                      <div key={`draw-row-${rIndex}`} className="flex gap-2">
                        {row.map((paint, cIndex) => {
                          const { color, letter } = getDrawCellDisplay(rIndex, cIndex, paint);
                          return (
                            <button
                              type="button"
                              key={`draw-cell-${rIndex}-${cIndex}`}
                              onClick={() => toggleDrawCell(rIndex, cIndex)}
                              className={`
                                w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-2xl sm:text-3xl font-bold uppercase rounded-sm border-2 select-none transition-colors
                                cursor-pointer hover:opacity-80
                                ${getBgColor(color, darkMode)}
                              `}
                            >
                              {letter}
                            </button>
                          );
                        })}
                      </div>
                    ))
                  : grid.map((row, rIndex) => (
                      <div key={rowIds.current[rIndex]} className="flex gap-2">
                        {row.map((cell, cIndex) => {
                          const isActive = rIndex === currentRow && cIndex === currentCol;
                          const isClickable = rIndex < currentRow || (rIndex === currentRow && cIndex < currentCol);

                          return (
                            <button
                              type="button"
                              key={`cell-${rIndex}-${cIndex}`}
                              onClick={() => { if (isClickable) toggleCellState(rIndex, cIndex); }}
                              disabled={!isClickable}
                              className={`
                                w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-2xl sm:text-3xl font-bold uppercase rounded-sm border-2 select-none transition-colors
                                disabled:opacity-100 disabled:cursor-default
                                ${getBgColor(cell.state, darkMode)}
                                ${isActive ? 'border-zinc-500 dark:border-zinc-400 scale-105' : ''}
                                ${isClickable ? 'cursor-pointer hover:opacity-80' : ''}
                              `}
                            >
                              {cell.letter}
                            </button>
                          );
                        })}
                      </div>
                    ))}
              </div>

              <div className="flex flex-col gap-3 w-full max-w-md mx-auto mt-2">
                <div className="flex bg-zinc-200 dark:bg-zinc-800 p-1 rounded-lg">
                  <button
                    onClick={() => setAppMode('solve')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition-all ${appMode === 'solve' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                  >
                    <Target size={16} /> Solve
                  </button>
                  <button
                    onClick={() => setAppMode('explore')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition-all ${appMode === 'explore' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                  >
                    <Compass size={16} /> Explore
                  </button>
                  <button
                    onClick={() => setAppMode('draw')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition-all ${appMode === 'draw' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                  >
                    <Palette size={16} /> Draw
                  </button>
                </div>

                {appMode === 'draw' ? (
                  <button
                    onClick={generateDrawWords}
                    className="flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-600 text-white py-2 px-4 rounded-lg font-medium transition-colors w-full"
                  >
                    <Sparkles size={18} /> Generate Words
                  </button>
                ) : (
                  <button
                    onClick={handleSuggestClick}
                    className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-2 px-4 rounded-lg font-medium transition-colors w-full"
                  >
                    <Sparkles size={18} /> Suggest
                  </button>
                )}
              </div>

              {appMode === 'draw' && (drawError || drawResults) && (
                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-4 space-y-3 w-full max-w-md mx-auto">
                  <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">
                    Words to Enter
                  </h2>

                  {drawError && (
                    <p className="text-sm text-red-500 dark:text-red-400">{drawError}</p>
                  )}

                  {drawWarning && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">{drawWarning}</p>
                  )}

                  {drawResults?.map((result) => (
                    <div key={result.row} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-500">Row {result.row + 1}</span>
                        {result.words.length === 0 ? (
                          <span className="text-xs text-red-500">No valid words — adjust your pattern</span>
                        ) : (
                          <span className="text-xs text-zinc-500">{result.words.length} option{result.words.length !== 1 ? 's' : ''}</span>
                        )}
                      </div>

                      {result.selected && (
                        <div className="flex items-center gap-2">
                          <p className="text-xl font-bold tracking-widest">{result.selected}</p>
                          <div className="flex gap-1">
                            {computeFeedback(result.selected, solutionWord.toUpperCase()).map((state, i) => (
                              <span
                                key={`preview-${result.row}-${i}`}
                                className={`w-6 h-6 rounded-sm ${getBgColor(state, darkMode)}`}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {result.words.length > 1 && (
                        <div className="max-h-16 overflow-y-auto custom-scrollbar">
                          <div className="flex flex-wrap gap-1.5">
                            {result.words.slice(0, 30).map((w) => (
                              <button
                                key={w}
                                type="button"
                                onClick={() => selectDrawWord(result.row, w)}
                                className={`px-2 py-1 rounded text-xs font-mono border transition-colors ${
                                  result.selected === w
                                    ? 'bg-violet-500 text-white border-violet-500'
                                    : 'bg-zinc-100 dark:bg-zinc-700/50 border-zinc-200 dark:border-zinc-600 hover:border-violet-400'
                                }`}
                              >
                                {w}
                              </button>
                            ))}
                            {result.words.length > 30 && (
                              <span className="text-xs text-zinc-500 py-1">+{result.words.length - 30} more</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {appMode !== 'draw' && (filteredWords !== null || suggestion) && (
                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-4 space-y-3 w-full max-w-md mx-auto">
                  <div className="flex justify-between items-center">
                    <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">
                      {appMode === 'explore' ? 'Explore Suggestion' : 'Possible Words'}
                    </h2>
                    <span className="text-xs font-medium bg-zinc-100 dark:bg-zinc-700 px-2 py-1 rounded">
                      {filteredWords?.length || 0} remaining
                    </span>
                  </div>

                  {suggestion && (
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-500 text-white p-1.5 rounded-md">
                        <Lightbulb size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {appMode === 'explore' ? 'Best Burner Word' : 'Best Suggestion'}
                        </p>
                        <p className="text-xl font-bold tracking-widest">{suggestion}</p>
                      </div>
                    </div>
                  )}

                  {filteredWords && filteredWords.length > 0 && appMode === 'solve' && (
                    <div className="max-h-24 overflow-y-auto custom-scrollbar mt-2">
                      <div className="flex flex-wrap gap-1.5">
                        {filteredWords.slice(0, 50).map(w => (
                          <span key={w} className="bg-zinc-100 dark:bg-zinc-700/50 px-2 py-1 rounded text-xs font-mono border border-zinc-200 dark:border-zinc-600">
                            {w}
                          </span>
                        ))}
                        {filteredWords.length > 50 && (
                          <span className="text-xs text-zinc-500 py-1">+{filteredWords.length - 50} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="w-full max-w-md mx-auto space-y-2 pb-4">
                {appMode !== 'draw' && KEYBOARD_ROWS.map((row) => (
                  <div key={row[0]} className="flex justify-center gap-1 sm:gap-1.5">
                    {row.map(key => {
                      const isSpecial = key === 'ENTER' || key === 'BACKSPACE';
                      return (
                        <button
                          key={key}
                          onClick={() => onKeyPress(key)}
                          className={`
                            h-12 sm:h-14 rounded font-bold text-sm sm:text-base flex items-center justify-center select-none transition-colors
                            ${isSpecial ? 'px-3 sm:px-4 text-xs sm:text-sm' : 'flex-1 max-w-[40px]'}
                            ${getKeyBgColor(keyColors[key], darkMode)}
                            hover:opacity-80 active:scale-95
                          `}
                        >
                          {key === 'BACKSPACE' ? <Delete size={20} /> : key}
                        </button>
                      );
                    })}
                  </div>
                ))}

                <div className="flex justify-center pt-2">
                  <button
                    onClick={appMode === 'draw' ? handleDrawReset : handleReset}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors text-sm"
                  >
                    <RefreshCw size={16} /> {appMode === 'draw' ? 'Reset Canvas' : 'Reset Game'}
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
