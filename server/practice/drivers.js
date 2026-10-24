// Turns a LeetCode-style function into a full program for Judge0.
//
// Every problem has a signature like
//   { fn: "twoSum", params: [{ name: "nums", type: "int[]" }, { name: "target", type: "int" }], returns: "int[]" }
// Supported types: int, int[], int[][], string, string[], bool
//
// Input is whitespace-separated tokens: first the number of tests, then each test's params in order.
//   int[]    -> length then values        e.g. "4 2 7 11 15"
//   int[][]  -> rows, then per row: length then values
//   string[] -> length then tokens (strings never contain spaces)
// Each test prints one line "@@RES@@ <result>" so the user's own print statements don't break judging.

export const RESULT_MARKER = "@@RES@@ "

const TYPES = {
    "int": { cpp: "int", java: "int", py: "int", js: "number" },
    "int[]": { cpp: "vector<int>", java: "int[]", py: "List[int]", js: "number[]" },
    "int[][]": { cpp: "vector<vector<int>>", java: "int[][]", py: "List[List[int]]", js: "number[][]" },
    "string": { cpp: "string", java: "String", py: "str", js: "string" },
    "string[]": { cpp: "vector<string>", java: "String[]", py: "List[str]", js: "string[]" },
    "bool": { cpp: "bool", java: "boolean", py: "bool", js: "boolean" }
}

const cppParam = ({ name, type }) => (type.endsWith("]") ? `${TYPES[type].cpp}& ${name}` : `${TYPES[type].cpp} ${name}`)

// ---------- starter code shown in the editor ----------

export const starterCode = (language, sig) => {
    const { fn, params, returns } = sig
    switch (language) {
        case "cpp":
            return `class Solution {
public:
    ${TYPES[returns].cpp} ${fn}(${params.map(cppParam).join(", ")}) {

    }
};
`
        case "java":
            return `class Solution {
    public ${TYPES[returns].java} ${fn}(${params.map(p => `${TYPES[p.type].java} ${p.name}`).join(", ")}) {

    }
}
`
        case "python":
            return `class Solution:
    def ${fn}(self, ${params.map(p => `${p.name}: ${TYPES[p.type].py}`).join(", ")}) -> ${TYPES[returns].py}:
        pass
`
        default:
            return `/**
${params.map(p => ` * @param {${TYPES[p.type].js}} ${p.name}`).join("\n")}
 * @return {${TYPES[returns].js}}
 */
var ${fn} = function(${params.map(p => p.name).join(", ")}) {

};
`
    }
}

// ---------- readers per language ----------

const cppRead = ({ name, type }) => {
    const v = `p_${name}`
    switch (type) {
        case "int": return `int ${v}; cin >> ${v};`
        case "string": return `string ${v}; cin >> ${v};`
        case "bool": return `string ${v}_s; cin >> ${v}_s; bool ${v} = ${v}_s == "true";`
        case "int[]": return `int ${v}_n; cin >> ${v}_n; vector<int> ${v}(${v}_n); for (auto &x : ${v}) cin >> x;`
        case "string[]": return `int ${v}_n; cin >> ${v}_n; vector<string> ${v}(${v}_n); for (auto &x : ${v}) cin >> x;`
        case "int[][]": return `int ${v}_r; cin >> ${v}_r; vector<vector<int>> ${v}(${v}_r); for (auto &row : ${v}) { int c; cin >> c; row.resize(c); for (auto &x : row) cin >> x; }`
    }
}

const javaRead = ({ name, type }) => {
    const v = `p_${name}`
    switch (type) {
        case "int": return `int ${v} = Integer.parseInt(next());`
        case "string": return `String ${v} = next();`
        case "bool": return `boolean ${v} = next().equals("true");`
        case "int[]": return `int ${v}_n = Integer.parseInt(next()); int[] ${v} = new int[${v}_n]; for (int i = 0; i < ${v}_n; i++) ${v}[i] = Integer.parseInt(next());`
        case "string[]": return `int ${v}_n = Integer.parseInt(next()); String[] ${v} = new String[${v}_n]; for (int i = 0; i < ${v}_n; i++) ${v}[i] = next();`
        case "int[][]": return `int ${v}_r = Integer.parseInt(next()); int[][] ${v} = new int[${v}_r][]; for (int i = 0; i < ${v}_r; i++) { int c = Integer.parseInt(next()); ${v}[i] = new int[c]; for (int j = 0; j < c; j++) ${v}[i][j] = Integer.parseInt(next()); }`
    }
}

const pyRead = ({ name, type }) => {
    const v = `p_${name}`
    switch (type) {
        case "int": return [`${v} = int(nxt())`]
        case "string": return [`${v} = nxt()`]
        case "bool": return [`${v} = nxt() == "true"`]
        case "int[]": return [`${v}_n = int(nxt())`, `${v} = [int(nxt()) for _ in range(${v}_n)]`]
        case "string[]": return [`${v}_n = int(nxt())`, `${v} = [nxt() for _ in range(${v}_n)]`]
        case "int[][]": return [`${v} = []`, `for _ in range(int(nxt())):`, `    ${v}_c = int(nxt())`, `    ${v}.append([int(nxt()) for _ in range(${v}_c)])`]
    }
}

const jsRead = ({ name, type }) => {
    const v = `p_${name}`
    switch (type) {
        case "int": return `const ${v} = Number(__next());`
        case "string": return `const ${v} = __next();`
        case "bool": return `const ${v} = __next() === "true";`
        case "int[]": return `const ${v} = Array.from({ length: Number(__next()) }, () => Number(__next()));`
        case "string[]": return `const ${v} = Array.from({ length: Number(__next()) }, () => __next());`
        case "int[][]": return `const ${v} = Array.from({ length: Number(__next()) }, () => Array.from({ length: Number(__next()) }, () => Number(__next())));`
    }
}

// ---------- full program ----------

export const buildProgram = (language, userCode, sig) => {
    const { fn, params } = sig
    const args = params.map(p => `p_${p.name}`).join(", ")

    switch (language) {
        case "cpp":
            return `#include <bits/stdc++.h>
using namespace std;
${userCode}

void judge_out(int x) { cout << x; }
void judge_out(long long x) { cout << x; }
void judge_out(bool b) { cout << (b ? "true" : "false"); }
void judge_out(const string &s) { cout << s; }
template <class T> void judge_out(const vector<T> &v) { cout << '['; for (size_t i = 0; i < v.size(); i++) { if (i) cout << ','; judge_out(v[i]); } cout << ']'; }

int main() {
    ios::sync_with_stdio(false); cin.tie(nullptr);
    int judge_t; cin >> judge_t;
    while (judge_t--) {
        ${params.map(cppRead).join("\n        ")}
        Solution judge_sol;
        auto judge_res = judge_sol.${fn}(${args});
        cout << "${RESULT_MARKER}"; judge_out(judge_res); cout << "\\n";
    }
    return 0;
}
`
        case "java":
            // Judge0 needs the public class to be Main, so Solution must not be public
            return `import java.util.*;
import java.io.*;
${userCode.replace(/public\s+class\s+Solution/, "class Solution")}

public class Main {
    static BufferedReader judgeIn = new BufferedReader(new InputStreamReader(System.in));
    static StringTokenizer judgeTok;
    static String next() throws IOException {
        while (judgeTok == null || !judgeTok.hasMoreTokens()) judgeTok = new StringTokenizer(judgeIn.readLine());
        return judgeTok.nextToken();
    }
    static String ser(Object o) {
        StringBuilder sb = new StringBuilder();
        if (o instanceof int[]) {
            int[] a = (int[]) o; sb.append('[');
            for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(','); sb.append(a[i]); }
            return sb.append(']').toString();
        }
        if (o instanceof Object[]) {
            Object[] a = (Object[]) o; sb.append('[');
            for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(','); sb.append(ser(a[i])); }
            return sb.append(']').toString();
        }
        if (o instanceof List) {
            List<?> a = (List<?>) o; sb.append('[');
            for (int i = 0; i < a.size(); i++) { if (i > 0) sb.append(','); sb.append(ser(a.get(i))); }
            return sb.append(']').toString();
        }
        return String.valueOf(o);
    }
    public static void main(String[] args) throws IOException {
        int judgeT = Integer.parseInt(next());
        StringBuilder judgeOut = new StringBuilder();
        while (judgeT-- > 0) {
            ${params.map(javaRead).join("\n            ")}
            Object judgeRes = new Solution().${fn}(${args});
            judgeOut.append("${RESULT_MARKER}").append(ser(judgeRes)).append('\\n');
        }
        System.out.flush();
        System.out.print(judgeOut);
        System.out.flush();
    }
}
`
        case "python":
            return `import sys
from typing import *
sys.setrecursionlimit(10**6)
${userCode}

def _judge_ser(x):
    if isinstance(x, bool):
        return "true" if x else "false"
    if isinstance(x, (list, tuple)):
        return "[" + ",".join(_judge_ser(y) for y in x) + "]"
    return str(x)

def _judge_main():
    data = sys.stdin.read().split()
    pos = 0
    def nxt():
        nonlocal pos
        pos += 1
        return data[pos - 1]
    out = []
    for _ in range(int(nxt())):
        ${params.flatMap(pyRead).join("\n        ")}
        out.append("${RESULT_MARKER}" + _judge_ser(Solution().${fn}(${args})))
    sys.stdout.flush()
    sys.stdout.write("\\n".join(out) + "\\n")

_judge_main()
`
        default:
            return `${userCode}

;(function () {
    const __tokens = require("fs").readFileSync(0, "utf8").split(/\\s+/).filter(Boolean);
    let __pos = 0;
    const __next = () => __tokens[__pos++];
    const __ser = (x) => typeof x === "boolean" ? String(x) : Array.isArray(x) ? "[" + x.map(__ser).join(",") + "]" : String(x);
    const __out = [];
    const __t = Number(__next());
    for (let __i = 0; __i < __t; __i++) {
        ${params.map(jsRead).join("\n        ")}
        __out.push("${RESULT_MARKER}" + __ser(${fn}(${args})));
    }
    process.stdout.write(__out.join("\\n") + "\\n");
})();
`
    }
}

// ---------- server-side serialization (must match the drivers) ----------

const serializeArg = (type, value) => {
    switch (type) {
        case "int": return String(value)
        case "string": return value
        case "bool": return String(value)
        case "int[]":
        case "string[]": return [value.length, ...value].join(" ")
        case "int[][]": return [value.length, ...value.map(row => [row.length, ...row].join(" "))].join("\n")
    }
}

export const serializeTests = (sig, tests) =>
    [tests.length, ...tests.map(args => sig.params.map((p, i) => serializeArg(p.type, args[i])).join("\n"))].join("\n") + "\n"

export const serializeResult = (x) =>
    typeof x === "boolean" ? String(x) : Array.isArray(x) ? "[" + x.map(serializeResult).join(",") + "]" : String(x)

// Human-friendly "nums = [2,7,11,15], target = 9"
export const displayArgs = (sig, args) => sig.params.map((p, i) => `${p.name} = ${JSON.stringify(args[i])}`).join(", ")
