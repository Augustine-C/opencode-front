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
//#region \0plugin-runtime:store
var o = globalThis[Symbol.for("opencode-front.plugin-runtime.v1")]?.store;
if (!o) throw Error("OpenCode Front plugin runtime is unavailable");
o.$RAW, o.DEV, o.createMutable;
var s = o.createStore;
o.isWrappable, o.modifyMutable, o.produce, o.reconcile, o.setProperty, o.unwrap, o.updatePath;
//#endregion
//#region \0plugin-runtime:solid
var c = globalThis[Symbol.for("opencode-front.plugin-runtime.v1")]?.solid;
if (!c) throw Error("OpenCode Front plugin runtime is unavailable");
c.$DEVCOMP, c.$PROXY, c.$TRACK, c.DEV, c.ErrorBoundary, c.For, c.Index, c.Match, c.Show, c.Suspense, c.SuspenseList, c.Switch, c.batch, c.catchError, c.children, c.createComponent, c.createComputed, c.createContext, c.createDeferred;
var l = c.createEffect;
c.createMemo, c.createReaction, c.createRenderEffect, c.createResource, c.createRoot, c.createSelector, c.createSignal, c.createUniqueId, c.enableExternalSource, c.enableHydration, c.enableScheduling, c.equalFn, c.from, c.getListener, c.getOwner, c.indexArray, c.lazy, c.mapArray, c.mergeProps, c.observable, c.on;
var u = c.onCleanup;
c.onError, c.onMount, c.requestCallback, c.resetErrorBoundaries, c.runWithOwner, c.sharedConfig, c.splitProps, c.startTransition;
var d = c.untrack;
c.useContext, c.useTransition;
//#endregion
//#region src/main.tsx
var f = /*#__PURE__*/ a("<span class=third-party-status-footer>"), p = /*#__PURE__*/ a("<div class=third-party-status-panel><p></p><button>Refresh status");
function m(e) {
	let [t, a] = s({
		label: "",
		value: "",
		error: "",
		loading: !1
	}), o = typeof e.options.endpoint == "string" ? e.options.endpoint : void 0, c = typeof e.options.interval == "number" && Number.isFinite(e.options.interval) ? Math.max(5e3, e.options.interval) : 6e4, m;
	async function h() {
		if (!(!o || t.loading || e.signal.aborted)) {
			clearTimeout(m), a({
				loading: !0,
				error: ""
			});
			try {
				let t = new URL(o);
				if (t.protocol !== "https:" && t.protocol !== "http:") throw Error("Status unavailable");
				let n = await fetch(t, {
					signal: e.signal,
					credentials: "omit"
				});
				if (!n.ok) throw Error(`HTTP ${n.status}`);
				let r = await n.json();
				if (!r || typeof r != "object" || !("label" in r) || !("value" in r) || typeof r.label != "string" || typeof r.value != "string") throw Error("Expected a JSON response with string label and value fields.");
				e.signal.aborted || a({
					label: r.label,
					value: r.value
				});
			} catch (t) {
				e.signal.aborted || a({
					value: "",
					error: t instanceof Error ? t.message : String(t)
				});
			} finally {
				a("loading", !1), e.signal.aborted || (m = setTimeout(() => void h(), c));
			}
		}
	}
	let g = () => (() => {
		var e = f();
		return r(e, () => o ? t.error ? "Status unavailable" : t.value ? `${t.label}: ${t.value}` : "Loading status…" : "Configure a status endpoint in plugin options."), e;
	})();
	return e.ui.slot({
		append: "home.footer.status",
		render: g
	}), e.ui.slot({
		append: "prompt.footer.status",
		render: g
	}), e.ui.slot({
		append: "sidebar.footer",
		render: g
	}), e.ui.slot({
		append: "session.panel",
		render: (e) => e.name === "third-party-status" ? (() => {
			var e = p(), a = e.firstChild, o = a.nextSibling;
			return r(e, g, a), r(a, () => t.error), o.$$click = () => void h(), n((e) => {
				var n = t.error ? "alert" : void 0, r = t.loading;
				return n !== e.e && i(a, "role", e.e = n), r !== e.t && (o.disabled = e.t = r), e;
			}, {
				e: void 0,
				t: void 0
			}), e;
		})() : null
	}), l(() => {
		u(d(() => e.ui.command({
			id: "refresh",
			title: "Refresh third-party status",
			run: h
		}))), u(d(() => e.ui.command({
			id: "panel",
			title: "Open third-party status panel",
			run: () => {
				e.ui.panel.open("third-party-status");
			}
		})));
	}), h(), () => clearTimeout(m);
}
t(["click"]);
//#endregion
export { m as setup };
