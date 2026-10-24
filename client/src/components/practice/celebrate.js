import confetti from "canvas-confetti"

// Two bursts from the sides when a solution is accepted
export const celebrate = () => {
    confetti({ particleCount: 80, spread: 250, origin: { x: 0.2, y: 0.6 } })
    confetti({ particleCount: 80, spread: 250, origin: { x: 0.8, y: 0.6 } })
}
