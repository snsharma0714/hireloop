import { serializeResult } from "./drivers.js"

// Original problem set. Each problem has a reference solution (`solve`) that computes the
// expected output for every test, and a seeded generator (`gen`) so hidden tests are the same on every run.
// Slugs match LeetCode slugs so the DSA sheets can link "Solve here" to these.

const makeRng = (seedText) => {
    let h = 1779033703 ^ seedText.length
    for (let i = 0; i < seedText.length; i++) {
        h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353)
        h = (h << 13) | (h >>> 19)
    }
    let a = h >>> 0
    const next = () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1))
    const R = {
        next,
        int,
        arr: (n, lo, hi) => Array.from({ length: n }, () => int(lo, hi)),
        pick: (list) => list[int(0, list.length - 1)],
        shuffle: (list) => {
            const a = [...list]
            for (let i = a.length - 1; i > 0; i--) {
                const j = int(0, i);
                [a[i], a[j]] = [a[j], a[i]]
            }
            return a
        },
        str: (n, alphabet) => Array.from({ length: n }, () => alphabet[int(0, alphabet.length - 1)]).join(""),
        distinct: (n, lo, hi) => {
            const set = new Set()
            while (set.size < n) set.add(int(lo, hi))
            return [...set]
        }
    }
    return R
}

const LOWER = "abcdefghijklmnopqrstuvwxyz"
const repeat = (count, fn) => Array.from({ length: count }, (_, i) => fn(i))

const PROBLEMS = [
    {
        slug: "two-sum",
        title: "Two Sum",
        difficulty: "Easy",
        topics: ["Array", "Hash Table"],
        signature: { fn: "twoSum", params: [{ name: "nums", type: "int[]" }, { name: "target", type: "int" }], returns: "int[]" },
        description: `You are given an integer array \`nums\` and an integer \`target\`. Find the two different positions \`i\` and \`j\` whose values add up to \`target\`, and return them as \`[i, j]\` with \`i < j\`.

Every input has exactly one valid pair, and the same position can't be used twice.`,
        constraints: ["2 ≤ nums.length ≤ 10^4", "-5·10^8 ≤ nums[i] ≤ 5·10^8", "Exactly one valid answer exists"],
        followUp: "Can you do better than O(n²)?",
        examples: [
            { args: [[2, 7, 11, 15], 9], explanation: "nums[0] + nums[1] = 2 + 7 = 9" },
            { args: [[3, 2, 4], 6] },
            { args: [[3, 3], 6] }
        ],
        solve: (nums, target) => {
            const seen = new Map()
            for (let i = 0; i < nums.length; i++) {
                if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i]
                seen.set(nums[i], i)
            }
            return []
        },
        gen: (R) => {
            const pairCount = (a, t) => {
                let c = 0
                const m = new Map()
                for (const x of a) {
                    c += m.get(t - x) || 0
                    m.set(x, (m.get(x) || 0) + 1)
                }
                return c
            }
            const make = (n, lo, hi) => {
                for (;;) {
                    const a = R.arr(n, lo, hi)
                    const i = R.int(0, n - 2), j = R.int(i + 1, n - 1)
                    if (pairCount(a, a[i] + a[j]) === 1) return [a, a[i] + a[j]]
                }
            }
            return [
                ...repeat(8, () => make(R.int(2, 10), -20, 20)),
                ...repeat(8, () => make(R.int(10, 100), -1000, 1000)),
                ...repeat(3, () => make(1000, -1e6, 1e6)),
                ...[make(10000, -5e8, 5e8)]
            ]
        }
    },
    {
        slug: "valid-parentheses",
        title: "Valid Parentheses",
        difficulty: "Easy",
        topics: ["String", "Stack"],
        signature: { fn: "isValid", params: [{ name: "s", type: "string" }], returns: "bool" },
        description: `The string \`s\` contains only the characters \`(\`, \`)\`, \`[\`, \`]\`, \`{\` and \`}\`. Return \`true\` if the brackets are balanced.

Brackets are balanced when every opening bracket is closed by the same kind of bracket, and brackets close in the reverse order they were opened.`,
        constraints: ["1 ≤ s.length ≤ 10^4", "s contains only ()[]{}"],
        examples: [{ args: ["()"] }, { args: ["()[]{}"] }, { args: ["(]"] }, { args: ["([)]"] }],
        solve: (s) => {
            const match = { ")": "(", "]": "[", "}": "{" }
            const st = []
            for (const c of s) {
                if (!match[c]) st.push(c)
                else if (st.pop() !== match[c]) return false
            }
            return st.length === 0
        },
        gen: (R) => {
            const pairs = ["()", "[]", "{}"]
            const balanced = (k) => {
                let s = ""
                const st = []
                let opens = k
                while (opens > 0 || st.length) {
                    if (opens > 0 && (st.length === 0 || R.next() < 0.5)) {
                        const p = R.pick(pairs)
                        s += p[0]; st.push(p[1]); opens--
                    } else s += st.pop()
                }
                return s
            }
            const corrupt = (s) => {
                const i = R.int(0, s.length - 1)
                return s.slice(0, i) + R.pick([..."()[]{}"]) + s.slice(i + 1)
            }
            const make = (k) => {
                const s = balanced(k)
                const r = R.next()
                if (r < 0.45) return [s]
                if (r < 0.9) return [corrupt(s)]
                return [s + R.pick([..."([{"])]
            }
            return [
                ["("], ["]"], ["(("], ["){"], ["{[]}"],
                ...repeat(10, () => make(R.int(1, 10))),
                ...repeat(8, () => make(R.int(50, 500))),
                ...repeat(2, () => make(5000))
            ]
        }
    },
    {
        slug: "best-time-to-buy-and-sell-stock",
        title: "Best Time to Buy and Sell Stock",
        difficulty: "Easy",
        topics: ["Array", "Dynamic Programming"],
        signature: { fn: "maxProfit", params: [{ name: "prices", type: "int[]" }], returns: "int" },
        description: `\`prices[i]\` is a stock's price on day \`i\`. You may buy once and then sell once on a later day.

Return the largest profit you can make. If no trade makes money, return \`0\`.`,
        constraints: ["1 ≤ prices.length ≤ 10^4", "0 ≤ prices[i] ≤ 10^4"],
        examples: [
            { args: [[7, 1, 5, 3, 6, 4]], explanation: "Buy at 1 on day 1, sell at 6 on day 4: profit 5" },
            { args: [[7, 6, 4, 3, 1]], explanation: "Prices only fall, so don't trade" }
        ],
        solve: (prices) => {
            let lo = Infinity, best = 0
            for (const p of prices) {
                lo = Math.min(lo, p)
                best = Math.max(best, p - lo)
            }
            return best
        },
        gen: (R) => [
            [[5]], [[1, 2]], [[2, 1]],
            ...repeat(10, () => [R.arr(R.int(1, 20), 0, 50)]),
            ...repeat(6, () => [R.arr(R.int(100, 2000), 0, 10000)]),
            [Array.from({ length: 10000 }, (_, i) => 10000 - i).map(x => x % 10001)],
            ...repeat(2, () => [R.arr(10000, 0, 10000)])
        ]
    },
    {
        slug: "maximum-subarray",
        title: "Maximum Subarray",
        difficulty: "Medium",
        topics: ["Array", "Dynamic Programming", "Divide and Conquer"],
        signature: { fn: "maxSubArray", params: [{ name: "nums", type: "int[]" }], returns: "int" },
        description: `Find the non-empty contiguous part of \`nums\` with the largest sum, and return that sum.`,
        constraints: ["1 ≤ nums.length ≤ 10^4", "-10^4 ≤ nums[i] ≤ 10^4"],
        followUp: "Solve it in O(n), then try a divide and conquer approach.",
        examples: [
            { args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], explanation: "[4,-1,2,1] has the largest sum, 6" },
            { args: [[1]] },
            { args: [[5, 4, -1, 7, 8]] }
        ],
        solve: (nums) => {
            let best = -Infinity, cur = 0
            for (const x of nums) {
                cur = Math.max(x, cur + x)
                best = Math.max(best, cur)
            }
            return best
        },
        gen: (R) => [
            [[-5]], [[-3, -1, -2]],
            ...repeat(10, () => [R.arr(R.int(1, 20), -20, 20)]),
            ...repeat(6, () => [R.arr(R.int(100, 5000), -10000, 10000)]),
            [R.arr(10000, -10000, -1)],
            ...repeat(2, () => [R.arr(10000, -10000, 10000)])
        ]
    },
    {
        slug: "contains-duplicate",
        title: "Contains Duplicate",
        difficulty: "Easy",
        topics: ["Array", "Hash Table", "Sorting"],
        signature: { fn: "containsDuplicate", params: [{ name: "nums", type: "int[]" }], returns: "bool" },
        description: `Return \`true\` if some value appears more than once in \`nums\`, and \`false\` if every value is unique.`,
        constraints: ["1 ≤ nums.length ≤ 10^4", "-10^9 ≤ nums[i] ≤ 10^9"],
        examples: [{ args: [[1, 2, 3, 1]] }, { args: [[1, 2, 3, 4]] }, { args: [[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]] }],
        solve: (nums) => new Set(nums).size !== nums.length,
        gen: (R) => {
            const withDup = (n) => {
                const a = R.distinct(n, -1e9, 1e9)
                a[0] = a[R.int(1, n - 1)]
                return [R.shuffle(a)]
            }
            return [
                [[7]],
                ...repeat(6, () => [R.distinct(R.int(2, 20), -50, 50)]),
                ...repeat(6, () => [R.arr(R.int(2, 20), 0, 10)]),
                ...repeat(4, () => withDup(R.int(100, 5000))),
                [R.distinct(8000, -1e9, 1e9)],
                withDup(8000)
            ]
        }
    },
    {
        slug: "valid-anagram",
        title: "Valid Anagram",
        difficulty: "Easy",
        topics: ["Hash Table", "String", "Sorting"],
        signature: { fn: "isAnagram", params: [{ name: "s", type: "string" }, { name: "t", type: "string" }], returns: "bool" },
        description: `Return \`true\` if \`t\` uses exactly the same letters as \`s\`, the same number of times each, just possibly in a different order.`,
        constraints: ["1 ≤ s.length, t.length ≤ 5·10^4", "s and t contain only lowercase English letters"],
        examples: [{ args: ["anagram", "nagaram"] }, { args: ["rat", "car"] }],
        solve: (s, t) => s.length === t.length && [...s].sort().join("") === [...t].sort().join(""),
        gen: (R) => {
            const make = (n) => {
                const s = R.str(n, LOWER)
                let t = R.shuffle([...s]).join("")
                const r = R.next()
                if (r < 0.3) {
                    const i = R.int(0, n - 1)
                    t = t.slice(0, i) + R.pick([...LOWER]) + t.slice(i + 1)
                } else if (r < 0.4) t += "a"
                return [s, t]
            }
            return [["a", "a"], ["a", "b"], ["ab", "a"], ...repeat(12, () => make(R.int(1, 30))), ...repeat(4, () => make(R.int(1000, 10000))), make(50000)]
        }
    },
    {
        slug: "binary-search",
        title: "Binary Search",
        difficulty: "Easy",
        topics: ["Array", "Binary Search"],
        signature: { fn: "search", params: [{ name: "nums", type: "int[]" }, { name: "target", type: "int" }], returns: "int" },
        description: `\`nums\` is sorted in increasing order and has no repeated values. Return the index of \`target\`, or \`-1\` if it isn't there.

Aim for O(log n) time.`,
        constraints: ["1 ≤ nums.length ≤ 10^4", "-10^4 < nums[i], target < 10^4", "nums is strictly increasing"],
        examples: [{ args: [[-1, 0, 3, 5, 9, 12], 9] }, { args: [[-1, 0, 3, 5, 9, 12], 2] }],
        solve: (nums, target) => nums.indexOf(target),
        gen: (R) => {
            const make = (n) => {
                const a = R.distinct(n, -9999, 9999).sort((x, y) => x - y)
                const target = R.next() < 0.6 ? R.pick(a) : R.int(-9999, 9999)
                return [a, target]
            }
            return [[[5], 5], [[5], -5], ...repeat(12, () => make(R.int(1, 30))), ...repeat(6, () => make(R.int(1000, 15000)))]
        }
    },
    {
        slug: "climbing-stairs",
        title: "Climbing Stairs",
        difficulty: "Easy",
        topics: ["Math", "Dynamic Programming", "Memoization"],
        signature: { fn: "climbStairs", params: [{ name: "n", type: "int" }], returns: "int" },
        description: `A staircase has \`n\` steps. Each move, you climb either 1 or 2 steps. In how many different ways can you reach the top?`,
        constraints: ["1 ≤ n ≤ 45"],
        examples: [{ args: [2], explanation: "1+1 or 2" }, { args: [3], explanation: "1+1+1, 1+2 or 2+1" }],
        solve: (n) => {
            let a = 1, b = 1
            for (let i = 2; i <= n; i++) [a, b] = [b, a + b]
            return b
        },
        gen: () => repeat(45, i => [i + 1])
    },
    {
        slug: "product-of-array-except-self",
        title: "Product of Array Except Self",
        difficulty: "Medium",
        topics: ["Array", "Prefix Sum"],
        signature: { fn: "productExceptSelf", params: [{ name: "nums", type: "int[]" }], returns: "int[]" },
        description: `Return an array \`answer\` where \`answer[i]\` is the product of every element of \`nums\` except \`nums[i]\`.

Do it in O(n) time without using division. All products fit in a 32-bit integer.`,
        constraints: ["2 ≤ nums.length ≤ 10^4", "-30 ≤ nums[i] ≤ 30", "Every product fits in a 32-bit integer"],
        followUp: "Can you use only O(1) extra space besides the output array?",
        examples: [{ args: [[1, 2, 3, 4]] }, { args: [[-1, 1, 0, -3, 3]] }],
        solve: (nums) => {
            const n = nums.length
            const out = new Array(n).fill(1)
            let left = 1
            for (let i = 0; i < n; i++) { out[i] = left; left *= nums[i] }
            let right = 1
            for (let i = n - 1; i >= 0; i--) { out[i] *= right; right *= nums[i] }
            return out.map(x => x + 0)
        },
        gen: (R) => {
            // mostly ±1 with a few bigger values so products stay in 32-bit range
            const make = (n, zeros) => {
                const a = R.arr(n, 0, 1).map(x => (x ? 1 : -1))
                for (let k = 0; k < Math.min(8, n); k++) a[R.int(0, n - 1)] = R.pick([2, 3, 4, -2, -3, -4])
                for (let k = 0; k < zeros; k++) a[R.int(0, n - 1)] = 0
                return [a]
            }
            return [[[0, 0]], [[2, 3]], [[-4, 0, 3]], ...repeat(10, () => make(R.int(2, 12), R.int(0, 1))), ...repeat(4, () => make(R.int(100, 5000), R.int(0, 2))), make(10000, 0), make(10000, 1)]
        }
    },
    {
        slug: "longest-substring-without-repeating-characters",
        title: "Longest Substring Without Repeating Characters",
        difficulty: "Medium",
        topics: ["Hash Table", "String", "Sliding Window"],
        signature: { fn: "lengthOfLongestSubstring", params: [{ name: "s", type: "string" }], returns: "int" },
        description: `Return the length of the longest contiguous piece of \`s\` in which no character appears twice.`,
        constraints: ["1 ≤ s.length ≤ 5·10^4", "s contains lowercase letters and digits"],
        examples: [
            { args: ["abcabcbb"], explanation: "\"abc\" has length 3" },
            { args: ["bbbbb"] },
            { args: ["pwwkew"], explanation: "\"wke\" has length 3. \"pwke\" doesn't count because it isn't contiguous" }
        ],
        solve: (s) => {
            const last = new Map()
            let start = 0, best = 0
            for (let i = 0; i < s.length; i++) {
                if (last.has(s[i]) && last.get(s[i]) >= start) start = last.get(s[i]) + 1
                last.set(s[i], i)
                best = Math.max(best, i - start + 1)
            }
            return best
        },
        gen: (R) => [
            ["a"], ["au"], ["dvdf"], ["abba"],
            ...repeat(8, () => [R.str(R.int(1, 20), "abc")]),
            ...repeat(6, () => [R.str(R.int(20, 200), LOWER + "0123456789")]),
            [R.str(50000, "ab")],
            ...repeat(2, () => [R.str(50000, LOWER + "0123456789")])
        ]
    },
    {
        slug: "merge-intervals",
        title: "Merge Intervals",
        difficulty: "Medium",
        topics: ["Array", "Sorting"],
        signature: { fn: "merge", params: [{ name: "intervals", type: "int[][]" }], returns: "int[][]" },
        description: `Each \`intervals[i] = [start, end]\`. Merge every group of overlapping intervals and return the result sorted by start.

Intervals that only touch, like \`[1,4]\` and \`[4,5]\`, count as overlapping.`,
        constraints: ["1 ≤ intervals.length ≤ 10^4", "0 ≤ start ≤ end ≤ 10^4"],
        examples: [
            { args: [[[1, 3], [2, 6], [8, 10], [15, 18]]], explanation: "[1,3] and [2,6] overlap, so they become [1,6]" },
            { args: [[[1, 4], [4, 5]]] }
        ],
        solve: (intervals) => {
            const sorted = intervals.map(x => [...x]).sort((a, b) => a[0] - b[0])
            const out = []
            for (const [s, e] of sorted) {
                if (out.length && s <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], e)
                else out.push([s, e])
            }
            return out
        },
        gen: (R) => {
            const make = (n, maxStart, maxLen) => [repeat(n, () => {
                const s = R.int(0, maxStart)
                return [s, Math.min(10000, s + R.int(0, maxLen))]
            })]
            return [[[[5, 5]]], [[[1, 4], [0, 4]]], [[[1, 4], [2, 3]]], ...repeat(10, () => make(R.int(1, 10), 30, 6)), ...repeat(5, () => make(R.int(100, 2000), 10000, 20)), make(10000, 10000, 3), make(10000, 10000, 100)]
        }
    },
    {
        slug: "number-of-islands",
        title: "Number of Islands",
        difficulty: "Medium",
        topics: ["Array", "Depth-First Search", "Breadth-First Search", "Matrix"],
        signature: { fn: "numIslands", params: [{ name: "grid", type: "string[]" }], returns: "int" },
        description: `\`grid\` is a map where \`'1'\` is land and \`'0'\` is water. Each \`grid[i]\` is one row, written as a string.

An island is a group of land cells connected up, down, left or right. Count the islands.`,
        constraints: ["1 ≤ rows, columns ≤ 200", "grid[i][j] is '0' or '1'"],
        examples: [
            { args: [["11110", "11010", "11000", "00000"]] },
            { args: [["11000", "11000", "00100", "00011"]] }
        ],
        solve: (grid) => {
            const rows = grid.length, cols = grid[0].length
            const seen = grid.map(r => new Array(cols).fill(false))
            let count = 0
            for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
                if (grid[i][j] !== "1" || seen[i][j]) continue
                count++
                const stack = [[i, j]]
                seen[i][j] = true
                while (stack.length) {
                    const [r, c] = stack.pop()
                    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                        const nr = r + dr, nc = c + dc
                        if (nr >= 0 && nc >= 0 && nr < rows && nc < cols && grid[nr][nc] === "1" && !seen[nr][nc]) {
                            seen[nr][nc] = true
                            stack.push([nr, nc])
                        }
                    }
                }
            }
            return count
        },
        gen: (R) => {
            const make = (rows, cols, landChance) => [repeat(rows, () => repeat(cols, () => (R.next() < landChance ? "1" : "0")).join(""))]
            return [[["0"]], [["1"]], [["101", "010", "101"]], ...repeat(10, () => make(R.int(1, 8), R.int(1, 8), 0.45)), ...repeat(4, () => make(R.int(30, 100), R.int(30, 100), R.pick([0.3, 0.5, 0.6]))), make(200, 200, 0.55), make(200, 200, 1)]
        }
    },
    {
        slug: "coin-change",
        title: "Coin Change",
        difficulty: "Medium",
        topics: ["Array", "Dynamic Programming", "Breadth-First Search"],
        signature: { fn: "coinChange", params: [{ name: "coins", type: "int[]" }, { name: "amount", type: "int" }], returns: "int" },
        description: `You have unlimited coins of each value in \`coins\`. Return the fewest coins that add up to exactly \`amount\`, or \`-1\` if it can't be done.`,
        constraints: ["1 ≤ coins.length ≤ 12", "1 ≤ coins[i] ≤ 500", "0 ≤ amount ≤ 10^4"],
        examples: [{ args: [[1, 2, 5], 11], explanation: "11 = 5 + 5 + 1" }, { args: [[2], 3] }, { args: [[1], 0] }],
        solve: (coins, amount) => {
            const dp = new Array(amount + 1).fill(Infinity)
            dp[0] = 0
            for (let a = 1; a <= amount; a++) for (const c of coins) if (c <= a && dp[a - c] + 1 < dp[a]) dp[a] = dp[a - c] + 1
            return dp[amount] === Infinity ? -1 : dp[amount]
        },
        gen: (R) => [
            [[186, 419, 83, 408], 6249], [[3, 7], 5], [[5], 10000],
            ...repeat(10, () => [R.distinct(R.int(1, 4), 1, 12), R.int(0, 60)]),
            ...repeat(6, () => [R.distinct(R.int(2, 12), 2, 500), R.int(100, 10000)]),
            [R.distinct(12, 1, 500), 10000]
        ]
    },
    {
        slug: "longest-increasing-subsequence",
        title: "Longest Increasing Subsequence",
        difficulty: "Medium",
        topics: ["Array", "Binary Search", "Dynamic Programming"],
        signature: { fn: "lengthOfLIS", params: [{ name: "nums", type: "int[]" }], returns: "int" },
        description: `Return the length of the longest strictly increasing subsequence of \`nums\`. A subsequence keeps the original order but may skip elements.`,
        constraints: ["1 ≤ nums.length ≤ 2500", "-10^4 ≤ nums[i] ≤ 10^4"],
        followUp: "An O(n²) solution passes. Can you do it in O(n log n)?",
        examples: [
            { args: [[10, 9, 2, 5, 3, 7, 101, 18]], explanation: "One longest subsequence is [2,3,7,101]" },
            { args: [[0, 1, 0, 3, 2, 3]] },
            { args: [[7, 7, 7, 7, 7, 7, 7]] }
        ],
        solve: (nums) => {
            const tails = []
            for (const x of nums) {
                let lo = 0, hi = tails.length
                while (lo < hi) {
                    const mid = (lo + hi) >> 1
                    if (tails[mid] < x) lo = mid + 1
                    else hi = mid
                }
                tails[lo] = x
            }
            return tails.length
        },
        gen: (R) => [
            [[1]], [[3, 2, 1]], [[1, 2, 3]],
            ...repeat(10, () => [R.arr(R.int(1, 20), -10, 10)]),
            ...repeat(5, () => [R.arr(R.int(200, 2500), -10000, 10000)]),
            [repeat(2500, i => i - 1250)]
        ]
    },
    {
        slug: "spiral-matrix",
        title: "Spiral Matrix",
        difficulty: "Medium",
        topics: ["Array", "Matrix", "Simulation"],
        signature: { fn: "spiralOrder", params: [{ name: "matrix", type: "int[][]" }], returns: "int[]" },
        description: `Return every element of the \`m x n\` \`matrix\`, read in clockwise spiral order starting from the top-left corner.`,
        constraints: ["1 ≤ m, n ≤ 10", "-100 ≤ matrix[i][j] ≤ 100"],
        examples: [
            { args: [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]] },
            { args: [[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]] }
        ],
        solve: (matrix) => {
            const out = []
            let top = 0, bottom = matrix.length - 1, left = 0, right = matrix[0].length - 1
            while (top <= bottom && left <= right) {
                for (let j = left; j <= right; j++) out.push(matrix[top][j])
                top++
                for (let i = top; i <= bottom; i++) out.push(matrix[i][right])
                right--
                if (top <= bottom) { for (let j = right; j >= left; j--) out.push(matrix[bottom][j]); bottom-- }
                if (left <= right) { for (let i = bottom; i >= top; i--) out.push(matrix[i][left]); left++ }
            }
            return out
        },
        gen: (R) => [
            [[[7]]], [[[1, 2, 3]]], [[[1], [2], [3]]],
            ...repeat(15, () => {
                const m = R.int(1, 10), n = R.int(1, 10)
                return [repeat(m, () => R.arr(n, -100, 100))]
            })
        ]
    },
    {
        slug: "kth-largest-element-in-an-array",
        title: "Kth Largest Element in an Array",
        difficulty: "Medium",
        topics: ["Array", "Divide and Conquer", "Sorting", "Heap (Priority Queue)", "Quickselect"],
        signature: { fn: "findKthLargest", params: [{ name: "nums", type: "int[]" }, { name: "k", type: "int" }], returns: "int" },
        description: `Return the \`k\`-th largest value in \`nums\` when the array is sorted in decreasing order. Duplicates count separately, so it's the k-th largest element, not the k-th largest distinct value.`,
        constraints: ["1 ≤ k ≤ nums.length ≤ 10^4", "-10^4 ≤ nums[i] ≤ 10^4"],
        followUp: "Can you solve it without fully sorting the array?",
        examples: [{ args: [[3, 2, 1, 5, 6, 4], 2] }, { args: [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4] }],
        solve: (nums, k) => [...nums].sort((a, b) => b - a)[k - 1],
        gen: (R) => {
            const make = (n, lo, hi) => [R.arr(n, lo, hi), R.int(1, n)]
            return [[[1], 1], [[2, 1], 2], ...repeat(10, () => make(R.int(1, 20), -10, 10)), ...repeat(5, () => make(R.int(500, 5000), -10000, 10000)), make(10000, -10000, 10000), make(10000, 5, 5)]
        }
    },
    {
        slug: "trapping-rain-water",
        title: "Trapping Rain Water",
        difficulty: "Hard",
        topics: ["Array", "Two Pointers", "Stack", "Dynamic Programming"],
        signature: { fn: "trap", params: [{ name: "height", type: "int[]" }], returns: "int" },
        description: `\`height[i]\` is the height of a bar of width 1. After it rains, water collects between the bars. Return the total units of water held.`,
        constraints: ["1 ≤ height.length ≤ 10^4", "0 ≤ height[i] ≤ 10^4"],
        examples: [{ args: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]] }, { args: [[4, 2, 0, 3, 2, 5]] }],
        solve: (height) => {
            let l = 0, r = height.length - 1, lmax = 0, rmax = 0, water = 0
            while (l < r) {
                if (height[l] < height[r]) {
                    lmax = Math.max(lmax, height[l]); water += lmax - height[l]; l++
                } else {
                    rmax = Math.max(rmax, height[r]); water += rmax - height[r]; r--
                }
            }
            return water
        },
        gen: (R) => [
            [[5]], [[2, 0, 2]], [[1, 2, 3]], [[3, 2, 1]],
            ...repeat(10, () => [R.arr(R.int(1, 20), 0, 10)]),
            ...repeat(5, () => [R.arr(R.int(500, 5000), 0, 10000)]),
            [[10000, ...R.arr(9998, 0, 50), 10000]],
            [R.arr(10000, 0, 10000)]
        ]
    },
    {
        slug: "search-in-rotated-sorted-array",
        title: "Search in Rotated Sorted Array",
        difficulty: "Medium",
        topics: ["Array", "Binary Search"],
        signature: { fn: "search", params: [{ name: "nums", type: "int[]" }, { name: "target", type: "int" }], returns: "int" },
        description: `A strictly increasing array was rotated at some unknown point, so \`[0,1,2,4,5,6,7]\` might become \`[4,5,6,7,0,1,2]\`. Return the index of \`target\` in \`nums\`, or \`-1\` if it's missing.

Aim for O(log n) time.`,
        constraints: ["1 ≤ nums.length ≤ 10^4", "-10^4 ≤ nums[i], target ≤ 10^4", "All values are distinct"],
        examples: [{ args: [[4, 5, 6, 7, 0, 1, 2], 0] }, { args: [[4, 5, 6, 7, 0, 1, 2], 3] }, { args: [[1], 0] }],
        solve: (nums, target) => nums.indexOf(target),
        gen: (R) => {
            const make = (n) => {
                const sorted = R.distinct(n, -10000, 10000).sort((a, b) => a - b)
                const k = R.int(0, n - 1)
                const a = [...sorted.slice(k), ...sorted.slice(0, k)]
                return [a, R.next() < 0.65 ? R.pick(a) : R.int(-10000, 10000)]
            }
            return [[[1, 3], 3], [[3, 1], 1], [[5, 1, 3], 5], ...repeat(12, () => make(R.int(1, 20))), ...repeat(5, () => make(R.int(1000, 10000)))]
        }
    },
    {
        slug: "house-robber",
        title: "House Robber",
        difficulty: "Medium",
        topics: ["Array", "Dynamic Programming"],
        signature: { fn: "rob", params: [{ name: "nums", type: "int[]" }], returns: "int" },
        description: `Houses along a street hold \`nums[i]\` money each. You can't take from two neighbouring houses. Return the most money you can collect.`,
        constraints: ["1 ≤ nums.length ≤ 100", "0 ≤ nums[i] ≤ 400"],
        examples: [{ args: [[1, 2, 3, 1]], explanation: "Houses 0 and 2: 1 + 3 = 4" }, { args: [[2, 7, 9, 3, 1]] }],
        solve: (nums) => {
            let take = 0, skip = 0
            for (const x of nums) [take, skip] = [skip + x, Math.max(take, skip)]
            return Math.max(take, skip)
        },
        gen: (R) => [[[0]], [[5]], [[2, 1, 1, 2]], ...repeat(15, () => [R.arr(R.int(1, 100), 0, 400)])]
    },
    {
        slug: "largest-rectangle-in-histogram",
        title: "Largest Rectangle in Histogram",
        difficulty: "Hard",
        topics: ["Array", "Stack", "Monotonic Stack"],
        signature: { fn: "largestRectangleArea", params: [{ name: "heights", type: "int[]" }], returns: "int" },
        description: `\`heights[i]\` is the height of a bar of width 1 in a histogram. Return the area of the largest rectangle that fits entirely inside the histogram.`,
        constraints: ["1 ≤ heights.length ≤ 10^4", "0 ≤ heights[i] ≤ 10^4"],
        examples: [{ args: [[2, 1, 5, 6, 2, 3]], explanation: "Bars of height 5 and 6 make a 5 x 2 rectangle" }, { args: [[2, 4]] }],
        solve: (heights) => {
            const st = []
            let best = 0
            for (let i = 0; i <= heights.length; i++) {
                const h = i === heights.length ? 0 : heights[i]
                while (st.length && heights[st[st.length - 1]] >= h) {
                    const height = heights[st.pop()]
                    const left = st.length ? st[st.length - 1] + 1 : 0
                    best = Math.max(best, height * (i - left))
                }
                st.push(i)
            }
            return best
        },
        gen: (R) => [
            [[0]], [[7]], [[1, 1, 1, 1]], [[5, 4, 3, 2, 1]],
            ...repeat(10, () => [R.arr(R.int(1, 20), 0, 10)]),
            ...repeat(4, () => [R.arr(R.int(500, 5000), 0, 10000)]),
            [repeat(10000, i => i % 10001)],
            [R.arr(10000, 0, 10000)]
        ]
    },
    {
        slug: "edit-distance",
        title: "Edit Distance",
        difficulty: "Medium",
        topics: ["String", "Dynamic Programming"],
        signature: { fn: "minDistance", params: [{ name: "word1", type: "string" }, { name: "word2", type: "string" }], returns: "int" },
        description: `Return the fewest single-character edits needed to turn \`word1\` into \`word2\`. An edit is inserting, deleting or replacing one character.`,
        constraints: ["1 ≤ word1.length, word2.length ≤ 300", "Both words contain only lowercase English letters"],
        examples: [
            { args: ["horse", "ros"], explanation: "horse → rorse (replace h) → rose (delete r) → ros (delete e)" },
            { args: ["intention", "execution"] }
        ],
        solve: (a, b) => {
            let prev = repeat(b.length + 1, j => j)
            for (let i = 1; i <= a.length; i++) {
                const cur = [i]
                for (let j = 1; j <= b.length; j++) {
                    cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j - 1], prev[j], cur[j - 1])
                }
                prev = cur
            }
            return prev[b.length]
        },
        gen: (R) => [
            ["a", "a"], ["a", "b"], ["abc", "yabd"],
            ...repeat(10, () => [R.str(R.int(1, 10), "abc"), R.str(R.int(1, 10), "abc")]),
            ...repeat(4, () => [R.str(R.int(50, 300), LOWER), R.str(R.int(50, 300), LOWER)]),
            ...repeat(2, () => [R.str(300, "ab"), R.str(300, "ab")])
        ]
    }
]

// ---------- prepared tests (computed once at startup) ----------

const clone = (x) => JSON.parse(JSON.stringify(x))

const prepared = new Map()
for (const p of PROBLEMS) {
    const R = makeRng(p.slug)
    const allArgs = [...p.examples.map(e => e.args), ...p.gen(R)]
    const tests = allArgs.map(args => ({ args, expected: serializeResult(p.solve(...clone(args))) }))
    prepared.set(p.slug, { ...p, sampleTests: tests.slice(0, p.examples.length), allTests: tests })
}

export const listProblems = () => [...prepared.values()]
export const getProblem = (slug) => prepared.get(slug)
