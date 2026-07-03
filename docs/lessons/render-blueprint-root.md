# render.yaml must sit at the repository root

Render Blueprints are only discovered when the file is named `render.yaml` at
the repo root — it was initially written to `backend/render.yaml`, where
Render would silently ignore it. Moved to the root with `rootDir: backend` in
the service definition so the monorepo layout still works. Manual dashboard
setup (Root Directory = `backend`) remains the documented alternative in the
README.
