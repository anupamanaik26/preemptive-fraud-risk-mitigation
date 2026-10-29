<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Decisions

- Additive insight features (scam signals, word-level explainability, threshold slider, /insights page) live in `src/features/insights/` and `src/components/new/`, gated by `src/features/insights/flags.ts`. Why: user mandated additive-only extension — existing pages/components/routes/styles/API must never be refactored for them.
- The /predict response may carry optional additive fields: `signals` (list of {name, detected, detail}), `fraud_probability` (number), and word-weight contributions under `explanation` (when it is an array) or `word_contributions`. New panels hide themselves when these are absent; the legacy `explanation` string contract is untouched. Why: keeps the existing response format and consumers working unchanged.
