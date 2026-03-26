# CrmWeb

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

✨ Your new, shiny [Nx workspace](https://nx.dev) is ready ✨.

[Learn more about this workspace setup and its capabilities](https://nx.dev/getting-started/tutorials/angular-standalone-tutorial?utm_source=nx_project&amp;utm_medium=readme&amp;utm_campaign=nx_projects) or run `npx nx graph` to visually explore what was created. Now, let's get you up to speed!

## Run tasks

To run the dev server for your app, use:

```sh
npx nx serve crm-web
```

To create a production bundle:

```sh
npx nx build crm-web
```

To see all available targets to run for a project, run:

```sh
npx nx show project crm-web
```

These targets are either [inferred automatically](https://nx.dev/concepts/inferred-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or defined in the `project.json` or `package.json` files.

[More about running tasks in the docs &raquo;](https://nx.dev/features/run-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Add new projects

While you could add new projects to your workspace manually, you might want to leverage [Nx plugins](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) and their [code generation](https://nx.dev/features/generate-code?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) feature.

Use the plugin's generator to create new projects.

To generate a new application, use:

```sh
npx nx g @nx/angular:app demo
```

To generate a new library, use:

```sh
npx nx g @nx/angular:lib mylib
```

You can use `npx nx list` to get a list of installed plugins. Then, run `npx nx list <plugin-name>` to learn about more specific capabilities of a particular plugin. Alternatively, [install Nx Console](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) to browse plugins and generators in your IDE.

[Learn more about Nx plugins &raquo;](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) | [Browse the plugin registry &raquo;](https://nx.dev/plugin-registry?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Set up CI!

### Step 1

To connect to Nx Cloud, run the following command:

```sh
npx nx connect
```

Connecting to Nx Cloud ensures a [fast and scalable CI](https://nx.dev/ci/intro/why-nx-cloud?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) pipeline. It includes features such as:

- [Remote caching](https://nx.dev/ci/features/remote-cache?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Task distribution across multiple machines](https://nx.dev/ci/features/distribute-task-execution?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Automated e2e test splitting](https://nx.dev/ci/features/split-e2e-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Task flakiness detection and rerunning](https://nx.dev/ci/features/flaky-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

### Step 2

Use the following command to configure a CI workflow for your workspace:

```sh
npx nx g ci-workflow
```

[Learn more about Nx on CI](https://nx.dev/ci/intro/ci-with-nx#ready-get-started-with-your-provider?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Install Nx Console

Nx Console is an editor extension that enriches your developer experience. It lets you run tasks, generate code, and improves code autocompletion in your IDE. It is available for VSCode and IntelliJ.

[Install Nx Console &raquo;](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Useful links

Learn more:

- [Learn more about this workspace setup](https://nx.dev/getting-started/tutorials/angular-standalone-tutorial?utm_source=nx_project&amp;utm_medium=readme&amp;utm_campaign=nx_projects)
- [Learn about Nx on CI](https://nx.dev/ci/intro/ci-with-nx?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Releasing Packages with Nx release](https://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [What are Nx plugins?](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

And join the Nx community:
- [Discord](https://go.nx.dev/community)
- [Follow us on X](https://twitter.com/nxdevtools) or [LinkedIn](https://www.linkedin.com/company/nrwl)
- [Our Youtube channel](https://www.youtube.com/@nxdevtools)
- [Our blog](https://nx.dev/blog?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Signals Migration: Step 2 (geometries-crud-page)

What changed:
- `items$` -> `items = toSignal(repo.getItems(), { initialValue: [] })`
- Local UI flags (`editId`, `formSubmitAttempted`, `isEditDialogOpen`) -> `signal(...)`
- Derived table projection (`geometriesData$`) -> `computed(...)`
- Template no longer uses `| async` for geometries list, now `[data]="geometriesData()"`
- Component methods use `.set(...)` for local state updates

Why:
- `toSignal` materializes repository streams into synchronous signal state
- `computed` keeps projection logic reactive and memoized
- Local UI state stays in component; SignalStore is deferred for shared/complex state

Validation:
- `npx nx build`
- Smoke: modal open/close, create/edit/delete, table rendering

References:
- https://angular.dev/guide/signals
- https://angular.dev/guide/ecosystem/rxjs-interop

## Signals Migration: Step 3 (materials SignalStore)

What changed:
- Added feature-local `MaterialsStore` using `withState`, `withComputed`, `withMethods`
- CRUD workflows moved to store methods with `patchState`
- Added `rxMethod` entrypoints for `loadItems`, `submit`, and `delete`
- `materials-crud-page` now consumes store signals and calls store actions

Why:
- Store keeps feature state centralized, predictable and testable
- Component becomes thinner: mostly form handling + UI bindings
- Reactive derived data (`materialsData`, `facts`, `isEditMode`) stays in one place

Validation:
- `npx nx build`
- Smoke: list load, create/edit/delete, form reset and mode toggling

References:
- https://ngrx.io/guide/signals/signal-store
- https://angular.dev/guide/ecosystem/rxjs-interop

## Signals Migration: Step 4 (geometries SignalStore)

What changed:
- Added feature-local `GeometriesStore` with `withState`, `withComputed`, `withMethods`
- CRUD actions moved to store methods and `rxMethod` entrypoints
- State updates centralized through `patchState`
- `geometries-crud-page` now reads store signals and triggers store actions

Why:
- Feature state becomes isolated and easier to test
- UI component is thinner and less coupled to repository implementation
- Derived data (`geometriesData`, `facts`, `isEditMode`) is colocated with state

Validation:
- `npx nx build`
- Smoke: create/edit/delete flows, edit modal open/close, list refresh

Reference:
- https://ngrx.io/guide/signals/signal-store

## Signals Migration: Step 5 (ThemeStore + facade)

What changed:
- Added global `ThemeStore` for theme state (`theme`, `preset`, `isDirty`)
- CSS variables and persistence sync moved to store (`effect` + `rxMethod`)
- `ThemeService` kept as deprecated facade proxying to `ThemeStore`
- `theme-picker` and `theme-studio` now read/call `ThemeStore` directly

Why:
- Theme becomes a single reactive source of truth
- Backward compatibility preserved through facade while migrating usages
- Less imperative theme orchestration in components

Validation:
- `npx nx build`
- Smoke: preset switch, JSON apply, refresh keeps selected theme

References:
- https://ngrx.io/guide/signals/signal-store
- https://angular.dev/guide/signals/effect

## Signals Migration: Step 6 (material-geometry filters + derived)

What changed:
- Local page filters/search/sort moved to `signal()`
- Page view model moved to `computed(() => vm)`
- Async model source uses `toSignal(...)` instead of `| async`
- Added optional debounced search path via `rxMethod` (`debounceTime`, `distinctUntilChanged`)
- Template now renders directly from signals (`vm().*`)

Why:
- State is page-local and not shared, so component signals are simpler than a store
- Derived projections and stats stay synchronized without manual subscriptions
- Debounce is used only for frequent search updates

Validation:
- `npx nx build`
- Smoke: search, sort, filter type, stats update, page loading state

References:
- https://angular.dev/guide/ecosystem/rxjs-interop
- https://ngrx.io/guide/signals/rxjs-integration

## Signals Migration: Step 7 (store tests)

- Coverage scope: `MaterialsStore`, `GeometriesStore`, `ThemeStore`
- Validates: load flows, submit/delete actions, computed projections, error handling
- Uses repository mocks and direct store method assertions
- Run tests with: `npx nx test crm-web`

## Signals Migration: Step 9 (final cleanup)

What changed:
- Removed duplicate store aliases in CRUD pages (e.g. `materialsData = store[...]`)
- `materials-crud-page` and `geometries-crud-page` now use single `vm = computed(...)`
- Templates consume only `vm()` values for table and UI flags

Why:
- Keeps SignalStore as the single source of truth
- Reduces risk of UI/store drift after future refactors
- Makes components thinner and more predictable

Validation:
- `npx nx build`
- Smoke: materials/geometries create/edit/delete

## Signals Migration: Step 10.1 (TanStack Query pilot for materials)

What changed:
- Installed `@tanstack/angular-query-experimental`
- Added global `provideTanStackQuery(new QueryClient(...))` in `app.config.ts`
- Migrated `MaterialsStore` fetching from `rxMethod(loadItems)` to `injectQuery`
- Kept existing CRUD methods (`submit`, `delete`) and switched to `injectMutation` + cache invalidation
- Preserved current component API (`store['items']`, `store['materialsData']`, `store['loadItems']`)

Why:
- Reduces manual loading boilerplate
- Moves server-state freshness and refetch logic to TanStack Query
- Allows incremental migration without breaking existing UI contracts

Validation:
- `npx nx build`
- Smoke: `/materials` list load + create/edit/delete
