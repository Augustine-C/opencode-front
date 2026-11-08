//#region \0plugin-runtime:web
var e = globalThis[Symbol.for("opencode-front.plugin-runtime.v1")]?.web;
if (!e) throw Error("OpenCode Front plugin runtime is unavailable");
e.Aliases, e.Assets, e.ChildProperties, e.DOMElements, e.DelegatedEvents, e.Dynamic, e.ErrorBoundary, e.For, e.Hydration, e.HydrationScript, e.Index, e.Match, e.NoHydration, e.Portal, e.Properties, e.RequestContext, e.SVGElements, e.SVGNamespace, e.Show, e.Suspense, e.SuspenseList, e.Switch, e.addEventListener, e.assign, e.classList, e.className, e.clearDelegatedEvents, e.createComponent, e.createDynamic;
var t = e.delegateEvents;
e.dynamicProperty;
var n = e.effect;
e.escape, e.generateHydrationScript, e.getAssets, e.getHydrationKey, e.getNextElement, e.getNextMarker, e.getNextMatch, e.getOwner, e.getPropAlias, e.getRequestEvent, e.hydrate;
var r = e.insert;
e.isDev, e.isServer, e.memo, e.mergeProps, e.pipeToNodeWritable, e.pipeToWritable, e.render, e.renderToStream, e.renderToString, e.renderToStringAsync, e.resolveSSRNode, e.runHydrationEvents;
var i = e.setAttribute;
e.setAttributeNS, e.setBoolAttribute, e.setProperty, e.setStyleProperty, e.spread, e.ssr, e.ssrAttribute, e.ssrClassList, e.ssrElement, e.ssrHydrationKey, e.ssrSpread, e.ssrStyle, e.ssrStyleProperty, e.style;
var a = e.template;
e.untrack, e.use, e.useAssets;
//#endregion
//#region \0plugin-runtime:solid
var o = globalThis[Symbol.for("opencode-front.plugin-runtime.v1")]?.solid;
if (!o) throw Error("OpenCode Front plugin runtime is unavailable");
o.$DEVCOMP, o.$PROXY, o.$TRACK, o.DEV, o.ErrorBoundary, o.For, o.Index, o.Match, o.Show, o.Suspense, o.SuspenseList, o.Switch, o.batch, o.catchError, o.children, o.createComponent, o.createComputed, o.createContext, o.createDeferred, o.createEffect, o.createMemo, o.createReaction, o.createRenderEffect, o.createResource, o.createRoot, o.createSelector;
var s = o.createSignal;
o.createUniqueId, o.enableExternalSource, o.enableHydration, o.enableScheduling, o.equalFn, o.from, o.getListener, o.getOwner, o.indexArray, o.lazy, o.mapArray, o.mergeProps, o.observable, o.on, o.onCleanup, o.onError, o.onMount, o.requestCallback, o.resetErrorBoundaries, o.runWithOwner, o.sharedConfig, o.splitProps, o.startTransition, o.untrack, o.useContext, o.useTransition;
//#endregion
//#region src/main.tsx
var c = /*#__PURE__*/ a("<section class=hello-independent-plugin><img alt=Hello width=32 height=32><p>Greetings saved: </p><button type=button>Add greeting");
function l(e) {
	let t = typeof e.options.title == "string" ? e.options.title : "Hello plugin", [a, o] = s(e.storage.get("greetings") ?? 0), l = e.ui.command({
		id: "hello",
		title: "Open Hello panel",
		run() {
			e.ui.panel.open("hello");
		}
	}), u = e.ui.panel.register({
		name: "hello",
		title: t
	}), d = e.ui.slot({
		append: "session.panel",
		render(t) {
			return t.name === "hello" ? (() => {
				var t = c(), s = t.firstChild, l = s.nextSibling;
				l.firstChild;
				var u = l.nextSibling;
				return r(l, a, null), u.$$click = () => {
					let t = a() + 1;
					o(t), e.storage.set("greetings", t);
				}, n(() => i(s, "src", e.assets.url("assets/hello.svg"))), t;
			})() : null;
		}
	});
	return () => {
		d(), u(), l();
	};
}
t(["click"]);
//#endregion
export { l as setup };
