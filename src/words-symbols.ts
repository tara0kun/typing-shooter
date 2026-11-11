import type { Words } from './game.ts';

/**
 * Digits, marks and code (数字・記号・コード), the same for English and Japanese players: keywords, short pieces of code, numbers,
 * dates and times, file names and drills of the marks on a keyboard; boss lines are a statement cut into parts.
 * Printable ASCII, lowercase only (keys are taken in lowercase), no backslash (¥ on a Japanese keyboard). 191 語・ボスの文 12 本.
 */

export const SYMBOLS: Words<string> = {
  short: [
    'if', '~x', '""', '#1', '!?', '@#',
    '()', '[]', '{}', '<>', ';:', '\'"',
    '~^', '$%', '&*', '-_', ',.', '/?',
    '`~', ':)', '<3', 'let', 'for', 'def',
    'i++', '++i', 'x--', '\'a\'', '-42', '0.5',
    '1/2', '255', '1e6', '3rd', '404', '```',
    '...', '^_^', 'else', 'true', 'null', 'f(x)',
    '${x}', '"hi"', '3.14', '100%', '2^10', '1024',
    '0xff', '16:9', '24/7', '9:05', '#fff', '10px',
    'const', 'while', 'break', 'class', 'false', 'async',
    'await', '!done', 'a < b', 'n % 2',
  ],
  medium: [
    'a ^ b', 'x & 1', 'a | b', '1,000', '99.9%', '-0.25',
    '$9.99', '12:30', '23:59', '07:00', '12/25', '10/31',
    '*.txt', '<div>', 'cd ..', 'ls -a', '<?php', '(>_<)',
    '(@_@)', 'return', 'import', 'export', 'lambda', 'struct',
    'main()', 'len(s)', 'a == b', 'a != b', 'a && b', 'a || b',
    'x >= 0', 'i <= 8', 'x ** 2', 'y >> 2', 'x := 5', 'a -> b',
    'a ?? b', 'arr[0]', '# todo', '0b1010', 'v2.3.1', '1h 30m',
    'app.js', '~/docs', '</div>', '&nbsp;', ':hover', '@media',
    '`code`', '[a-z]+', '--help', '@param', '(*^^*)', 'default',
    'abs(-5)', 'sqrt(2)', 'self.hp', 'x += 1;', 'y -= 2;', 'x *= 2;',
    'x !== y', 'a[i][j]', '// note',
  ],
  long: [
    '8:45 pm', 'main.ts', 'test.py', '#ff8800',
    '.box {}', '$x = 5;', 'm(_ _)m', 'function',
    'continue', 'x.length', '() => {}', 'list[-1]',
    '{ x: 1 }', '/* hi */', '<!-- -->', '00:00:01',
    '**bold**', 'undefined', 'interface', 'max(a, b)',
    'range(10)', 'puts \'hi\'', 'std::cout', 'def f(x):',
    'fn main()', 'let mut x', 'obj?.name', 'import os',
    'return 0;', 'a ? b : c', '[1, 2, 3]', '`${name}`',
    '1 + 1 = 2', 'style.css', 'readme.md', 'data.json',
    'notes.txt', 'photo.png', '<p>hi</p>', 'ls | sort',
    'git add .', '@echo off', '#!/bin/sh', 'instanceof',
    'int main()', 'x => x * 2', '7 * 8 = 56', '12 / 4 = 3',
    '2026-11-12', '2026/04/01', 'index.html', '.gitignore',
    'margin: 0;', '- [ ] todo', 'print("hi")', 'arr.push(4)',
    'this.x = 1;', '10:00-17:00', 'src/main.ts', 'my_file.txt',
    'color: red;', 's.split(",")', 'package.json', 'console.log(x)',
  ],
  lines: [
    ['for (i = 0;', 'i < 3; i++)', 'fire();'],
    ['for c in', '[\'a\', \'b\']:', 'print(c)'],
    ['select', 'max_hp', 'from hero;'],
    ['let s =', '`hp: ${hp}`;', 'alert(s);'],
    ['let max =', '(a, b) =>', 'a > b ?', 'a : b;'],
    ['if (n % 2', '!== 0)', 'odd++;'],
    ['let x =', '5 ^ 3;', '// x is 6'],
    ['/** @param', '{number} x', '*/'],
    ['#include', '<stdio.h>', '// printf'],
    ['print("a",', '"b",', 'sep="-")'],
    ['5.times', '{ |i|', 'puts i }'],
    ['cd ~/camp', '&& ls -a', '&& pwd'],
  ],
};
