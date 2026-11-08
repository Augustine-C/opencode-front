//#region \0plugin-runtime:web
var e = globalThis[Symbol.for("opencode-front.plugin-runtime.v1")]?.web;
if (!e) throw Error("OpenCode Front plugin runtime is unavailable");
e.Aliases, e.Assets, e.ChildProperties, e.DOMElements, e.DelegatedEvents, e.Dynamic, e.ErrorBoundary, e.For, e.Hydration, e.HydrationScript, e.Index, e.Match, e.NoHydration, e.Portal, e.Properties, e.RequestContext, e.SVGElements, e.SVGNamespace, e.Show, e.Suspense, e.SuspenseList, e.Switch, e.addEventListener, e.assign, e.classList, e.className, e.clearDelegatedEvents;
var t = e.createComponent;
e.createDynamic;
var n = e.delegateEvents;
e.dynamicProperty;
var r = e.effect;
e.escape, e.generateHydrationScript, e.getAssets, e.getHydrationKey, e.getNextElement, e.getNextMarker, e.getNextMatch, e.getOwner, e.getPropAlias, e.getRequestEvent, e.hydrate;
var i = e.insert;
e.isDev, e.isServer, e.memo, e.mergeProps, e.pipeToNodeWritable, e.pipeToWritable, e.render, e.renderToStream, e.renderToString, e.renderToStringAsync, e.resolveSSRNode, e.runHydrationEvents;
var a = e.setAttribute;
e.setAttributeNS, e.setBoolAttribute, e.setProperty;
var o = e.setStyleProperty;
e.spread, e.ssr, e.ssrAttribute, e.ssrClassList, e.ssrElement, e.ssrHydrationKey, e.ssrSpread, e.ssrStyle, e.ssrStyleProperty, e.style;
var s = e.template;
e.untrack, e.use, e.useAssets;
//#endregion
//#region \0plugin-runtime:solid
var c = globalThis[Symbol.for("opencode-front.plugin-runtime.v1")]?.solid;
if (!c) throw Error("OpenCode Front plugin runtime is unavailable");
c.$DEVCOMP, c.$PROXY, c.$TRACK, c.DEV, c.ErrorBoundary;
var l = c.For;
c.Index, c.Match, c.Show, c.Suspense, c.SuspenseList, c.Switch, c.batch, c.catchError, c.children, c.createComponent, c.createComputed, c.createContext, c.createDeferred;
var u = c.createEffect;
c.createMemo, c.createReaction, c.createRenderEffect, c.createResource, c.createRoot, c.createSelector, c.createSignal, c.createUniqueId, c.enableExternalSource, c.enableHydration, c.enableScheduling, c.equalFn, c.from, c.getListener, c.getOwner, c.indexArray, c.lazy, c.mapArray, c.mergeProps, c.observable, c.on;
var d = c.onCleanup;
c.onError, c.onMount, c.requestCallback, c.resetErrorBoundaries, c.runWithOwner, c.sharedConfig, c.splitProps, c.startTransition;
var f = c.untrack;
c.useContext, c.useTransition;
//#endregion
//#region \0plugin-runtime:store
var p = globalThis[Symbol.for("opencode-front.plugin-runtime.v1")]?.store;
if (!p) throw Error("OpenCode Front plugin runtime is unavailable");
p.$RAW, p.DEV, p.createMutable;
var m = p.createStore;
p.isWrappable, p.modifyMutable, p.produce, p.reconcile, p.setProperty, p.unwrap, p.updatePath;
//#endregion
//#region src/main.tsx
var h = /*#__PURE__*/ s("<section data-component=plugin-panel-demo><div class=panel-demo-intro><span class=panel-demo-badge>Sample data</span><p>Explore a sample project overview, checklist, and notes.</p></div><dl class=panel-demo-metrics><div><dt>Build status</dt><dd class=panel-demo-ready>Ready</dd></div><div><dt>Completed checks</dt><dd> / </dd></div></dl><div class=panel-demo-sections><section class=panel-demo-card><h3>Checklist</h3><div role=progressbar aria-label=Checklist aria-valuemin=0 class=panel-demo-progress><span></span></div><div class=panel-demo-tasks></div></section><section class=panel-demo-card><label for=panel-demo-note>Notes</label><textarea id=panel-demo-note rows=4 placeholder=\"Try adding a note…\"></textarea><span class=panel-demo-session-label>Current session</span><code class=panel-demo-session-id></code></section></div><div class=panel-demo-actions><button type=button class=panel-demo-reset>Reset example"), g = /*#__PURE__*/ s("<label class=panel-demo-task><input type=checkbox><span>");
function _(e) {
	let [n, s] = m({
		completed: [
			!0,
			!1,
			!1
		],
		note: ""
	}), c = () => typeof e.options.title == "string" && e.options.title.trim() ? e.options.title.trim() : "Project overview", p = e.options.presentation === "fullscreen" ? "fullscreen" : "panel", _ = () => {
		e.ui.panel.open("panel-demo", {
			title: c(),
			presentation: p
		});
	}, v = [
		"Review changes",
		"Run checks",
		"Prepare release"
	], y = () => n.completed.filter(Boolean).length;
	u(() => {
		e.sessionID() && d(f(() => e.ui.command({
			id: "open",
			title: "Open example plugin panel",
			run: _
		})));
	}), u(() => {
		if (e.options.showLauncher === !1) return;
		let t = c();
		d(f(() => e.ui.panel.register({
			name: "panel-demo",
			title: t,
			presentation: p
		})));
	}), e.ui.slot({
		append: "session.panel",
		render: (e) => e.name === "panel-demo" ? (() => {
			var c = h(), u = c.firstChild.nextSibling, d = u.firstChild.nextSibling.firstChild.nextSibling, f = d.firstChild, p = u.nextSibling, m = p.firstChild, _ = m.firstChild.nextSibling, b = _.firstChild, x = _.nextSibling, S = m.nextSibling.firstChild.nextSibling, C = S.nextSibling.nextSibling, w = p.nextSibling.firstChild;
			return i(d, y, f), i(d, () => v.length, null), i(x, t(l, {
				each: v,
				children: (e, t) => (() => {
					var a = g(), o = a.firstChild, c = o.nextSibling;
					return o.addEventListener("change", (e) => s("completed", t(), e.currentTarget.checked)), i(c, e), r(() => o.checked = n.completed[t()]), a;
				})()
			})), S.$$input = (e) => s("note", e.currentTarget.value), i(C, () => e.sessionID), w.$$click = () => s({
				completed: [
					!0,
					!1,
					!1
				],
				note: ""
			}), r((e) => {
				var t = v.length, n = y(), r = `${y() / v.length * 100}%`;
				return t !== e.e && a(_, "aria-valuemax", e.e = t), n !== e.t && a(_, "aria-valuenow", e.t = n), r !== e.a && o(b, "width", e.a = r), e;
			}, {
				e: void 0,
				t: void 0,
				a: void 0
			}), r(() => S.value = n.note), c;
		})() : null
	});
}
n(["input", "click"]);
//#endregion
export { _ as setup };
