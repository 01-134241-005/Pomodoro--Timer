
## 1. How to run
Open `index.html` in any modern browser. There are no dependencies to install and no build command.
## 2. Stack & design choices
I used vanilla HTML, CSS, and JavaScript because the app is intentionally small and interaction-heavy. Avoiding a build step makes the submission easy to run on a fresh machine, while plain browser APIs are enough for local storage, timer updates, and the audible cue.

I made the timer a large circular stage in the center of the screen because the user needs to read the remaining time at a glance from across a desk. The progress ring gives a quick sense of how much of the current focus or break period has passed without requiring the user to parse numbers.
I separated the completed-session history into a right-side panel on wide screens and a stacked section on narrow screens. That keeps the laptop layout efficient while still letting the 360px phone layout keep the timer first and the daily record immediately below it.
## 3. Responsive & accessibility
At 360px wide, the app becomes a single column, the controls stack vertically, and the ring scales down so the timer remains readable without horizontal scrolling. At 1440px wide, the timer and history sit side by side with the countdown taking most of the visual weight.
One accessibility consideration I handled is visible keyboard focus on buttons and inputs, plus a `role="timer"` countdown, polite live regions for state/history updates, and reduced-motion handling for the completion pulse. One thing I knowingly skipped is a dedicated mute toggle; browsers require a user gesture before audio can play, but with another pass I would make sound preferences explicit in the UI.
## 4. AI usage
I used ChatGPT/Codex to generate and implement the frontend project from the assessment prompt. I asked it to create a single-screen pomodoro timer with configurable focus and break durations, automatic transitions, a sound at cycle completion, daily local-storage history, responsive styling, README, answers, and commit history.
The AI output was reviewed and adjusted during implementation. One specific change was keeping the project vanilla instead of using a framework scaffold, because the assessment rewards quick local usability and a browser-only app can run by opening `index.html`. I also kept the history storage keyed by the current calendar day so a reload preserves today's entries while a new date starts cleanly.
## 5. Honest gap
The completion sound is intentionally simple: two generated tones from the Web Audio API. With another day, I would add a subtle visual/sound preference area so users can choose between muted, soft, and stronger cues, and I would persist those preferences alongside the timer lengths.

