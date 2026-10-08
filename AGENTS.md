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

- Game logic lives in `src/game/sim.ts` as plain mutable state stepped from one `useFrame`; React components only render and sync refs — avoids per-frame React re-renders.
- The game route is `ssr: false` because WebGL, canvas textures and pointer lock are browser-only.
- Cars and pedestrians use CC0 Kenney GLBs from `public/models/` (external `Textures/colormap.png` must sit beside them), loaded in `src/game/RealModels.tsx`; Keke stays procedural because no CC0 tricycle exists in the kit.
