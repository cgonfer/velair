//#region \0rolldown/runtime.js
var e = Object.defineProperty, t = (t, n) => {
	let r = {};
	for (var i in t) e(r, i, {
		get: t[i],
		enumerable: !0
	});
	return n || e(r, Symbol.toStringTag, { value: "Module" }), r;
}, n = "20260614131938", r = "1.0.0", i = globalThis, a = i.ShadowRoot && (i.ShadyCSS === void 0 || i.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, o = Symbol(), s = /* @__PURE__ */ new WeakMap(), c = class {
	constructor(e, t, n) {
		if (this._$cssResult$ = !0, n !== o) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, t = this.t;
		if (a && e === void 0) {
			let n = t !== void 0 && t.length === 1;
			n && (e = s.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), n && s.set(t, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, l = (e) => new c(typeof e == "string" ? e : e + "", void 0, o), u = (e, ...t) => new c(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, o), d = (e, t) => {
	if (a) e.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let n of t) {
		let t = document.createElement("style"), r = i.litNonce;
		r !== void 0 && t.setAttribute("nonce", r), t.textContent = n.cssText, e.appendChild(t);
	}
}, ee = a ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return l(t);
})(e) : e, { is: te, defineProperty: ne, getOwnPropertyDescriptor: re, getOwnPropertyNames: ie, getOwnPropertySymbols: ae, getPrototypeOf: oe } = Object, se = globalThis, ce = se.trustedTypes, le = ce ? ce.emptyScript : "", ue = se.reactiveElementPolyfillSupport, f = (e, t) => e, de = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? le : null;
				break;
			case Object:
			case Array: e = e == null ? e : JSON.stringify(e);
		}
		return e;
	},
	fromAttribute(e, t) {
		let n = e;
		switch (t) {
			case Boolean:
				n = e !== null;
				break;
			case Number:
				n = e === null ? null : Number(e);
				break;
			case Object:
			case Array: try {
				n = JSON.parse(e);
			} catch {
				n = null;
			}
		}
		return n;
	}
}, fe = (e, t) => !te(e, t), pe = {
	attribute: !0,
	type: String,
	converter: de,
	reflect: !1,
	useDefault: !1,
	hasChanged: fe
};
Symbol.metadata ??= Symbol("metadata"), se.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var p = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = pe) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && ne(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = re(this.prototype, e) ?? {
			get() {
				return this[t];
			},
			set(e) {
				this[t] = e;
			}
		};
		return {
			get: r,
			set(t) {
				let a = r?.call(this);
				i?.call(this, t), this.requestUpdate(e, a, n);
			},
			configurable: !0,
			enumerable: !0
		};
	}
	static getPropertyOptions(e) {
		return this.elementProperties.get(e) ?? pe;
	}
	static _$Ei() {
		if (this.hasOwnProperty(f("elementProperties"))) return;
		let e = oe(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(f("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(f("properties"))) {
			let e = this.properties, t = [...ie(e), ...ae(e)];
			for (let n of t) this.createProperty(n, e[n]);
		}
		let e = this[Symbol.metadata];
		if (e !== null) {
			let t = litPropertyMetadata.get(e);
			if (t !== void 0) for (let [e, n] of t) this.elementProperties.set(e, n);
		}
		this._$Eh = /* @__PURE__ */ new Map();
		for (let [e, t] of this.elementProperties) {
			let n = this._$Eu(e, t);
			n !== void 0 && this._$Eh.set(n, e);
		}
		this.elementStyles = this.finalizeStyles(this.styles);
	}
	static finalizeStyles(e) {
		let t = [];
		if (Array.isArray(e)) {
			let n = new Set(e.flat(Infinity).reverse());
			for (let e of n) t.unshift(ee(e));
		} else e !== void 0 && t.push(ee(e));
		return t;
	}
	static _$Eu(e, t) {
		let n = t.attribute;
		return !1 === n ? void 0 : typeof n == "string" ? n : typeof e == "string" ? e.toLowerCase() : void 0;
	}
	constructor() {
		super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
	}
	_$Ev() {
		this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
	}
	addController(e) {
		(this._$EO ??= /* @__PURE__ */ new Set()).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
	}
	removeController(e) {
		this._$EO?.delete(e);
	}
	_$E_() {
		let e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
		for (let n of t.keys()) this.hasOwnProperty(n) && (e.set(n, this[n]), delete this[n]);
		e.size > 0 && (this._$Ep = e);
	}
	createRenderRoot() {
		let e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
		return d(e, this.constructor.elementStyles), e;
	}
	connectedCallback() {
		this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
	}
	enableUpdating(e) {}
	disconnectedCallback() {
		this._$EO?.forEach((e) => e.hostDisconnected?.());
	}
	attributeChangedCallback(e, t, n) {
		this._$AK(e, n);
	}
	_$ET(e, t) {
		let n = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, n);
		if (r !== void 0 && !0 === n.reflect) {
			let i = (n.converter?.toAttribute === void 0 ? de : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? de : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? fe)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
			this.C(e, t, n);
		}
		!1 === this.isUpdatePending && (this._$ES = this._$EP());
	}
	C(e, t, { useDefault: n, reflect: r, wrapped: i }, a) {
		n && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? t ?? this[e]), !0 !== i || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || n || (t = void 0), this._$AL.set(e, t)), !0 === r && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
	}
	async _$EP() {
		this.isUpdatePending = !0;
		try {
			await this._$ES;
		} catch (e) {
			Promise.reject(e);
		}
		let e = this.scheduleUpdate();
		return e != null && await e, !this.isUpdatePending;
	}
	scheduleUpdate() {
		return this.performUpdate();
	}
	performUpdate() {
		if (!this.isUpdatePending) return;
		if (!this.hasUpdated) {
			if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
				for (let [e, t] of this._$Ep) this[e] = t;
				this._$Ep = void 0;
			}
			let e = this.constructor.elementProperties;
			if (e.size > 0) for (let [t, n] of e) {
				let { wrapped: e } = n, r = this[t];
				!0 !== e || this._$AL.has(t) || r === void 0 || this.C(t, void 0, n, r);
			}
		}
		let e = !1, t = this._$AL;
		try {
			e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((e) => e.hostUpdate?.()), this.update(t)) : this._$EM();
		} catch (t) {
			throw e = !1, this._$EM(), t;
		}
		e && this._$AE(t);
	}
	willUpdate(e) {}
	_$AE(e) {
		this._$EO?.forEach((e) => e.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
	}
	_$EM() {
		this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
	}
	get updateComplete() {
		return this.getUpdateComplete();
	}
	getUpdateComplete() {
		return this._$ES;
	}
	shouldUpdate(e) {
		return !0;
	}
	update(e) {
		this._$Eq &&= this._$Eq.forEach((e) => this._$ET(e, this[e])), this._$EM();
	}
	updated(e) {}
	firstUpdated(e) {}
};
p.elementStyles = [], p.shadowRootOptions = { mode: "open" }, p[f("elementProperties")] = /* @__PURE__ */ new Map(), p[f("finalized")] = /* @__PURE__ */ new Map(), ue?.({ ReactiveElement: p }), (se.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var me = globalThis, he = (e) => e, ge = me.trustedTypes, _e = ge ? ge.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, ve = "$lit$", m = `lit$${Math.random().toFixed(9).slice(2)}$`, ye = "?" + m, be = `<${ye}>`, h = document, g = () => h.createComment(""), _ = (e) => e === null || typeof e != "object" && typeof e != "function", xe = Array.isArray, Se = (e) => xe(e) || typeof e?.[Symbol.iterator] == "function", Ce = "[ 	\n\f\r]", v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, we = /-->/g, Te = />/g, y = RegExp(`>|${Ce}(?:([^\\s"'>=/]+)(${Ce}*=${Ce}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), Ee = /'/g, De = /"/g, Oe = /^(?:script|style|textarea|title)$/i, b = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), x = Symbol.for("lit-noChange"), S = Symbol.for("lit-nothing"), ke = /* @__PURE__ */ new WeakMap(), C = h.createTreeWalker(h, 129);
function Ae(e, t) {
	if (!xe(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return _e === void 0 ? t : _e.createHTML(t);
}
var je = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = v;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === v ? c[1] === "!--" ? o = we : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = y) : (Oe.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = y) : o = Te : o === y ? c[0] === ">" ? (o = i ?? v, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? y : c[3] === "\"" ? De : Ee) : o === De || o === Ee ? o = y : o === we || o === Te ? o = v : (o = y, i = void 0);
		let d = o === y && e[t + 1].startsWith("/>") ? " " : "";
		a += o === v ? n + be : l >= 0 ? (r.push(s), n.slice(0, l) + ve + n.slice(l) + m + d) : n + m + (l === -2 ? t : d);
	}
	return [Ae(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, Me = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = je(t, n);
		if (this.el = e.createElement(l, r), C.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = C.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(ve)) {
					let t = u[o++], n = i.getAttribute(e).split(m), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Fe : r[1] === "?" ? Ie : r[1] === "@" ? Le : T
					}), i.removeAttribute(e);
				} else e.startsWith(m) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (Oe.test(i.tagName)) {
					let e = i.textContent.split(m), t = e.length - 1;
					if (t > 0) {
						i.textContent = ge ? ge.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], g()), C.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], g());
					}
				}
			} else if (i.nodeType === 8) if (i.data === ye) c.push({
				type: 2,
				index: a
			});
			else {
				let e = -1;
				for (; (e = i.data.indexOf(m, e + 1)) !== -1;) c.push({
					type: 7,
					index: a
				}), e += m.length - 1;
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = h.createElement("template");
		return n.innerHTML = e, n;
	}
};
function w(e, t, n = e, r) {
	if (t === x) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = _(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = w(e, i._$AS(e, t.values), i, r)), t;
}
var Ne = class {
	constructor(e, t) {
		this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
	}
	get parentNode() {
		return this._$AM.parentNode;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	u(e) {
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? h).importNode(t, !0);
		C.currentNode = r;
		let i = C.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new Pe(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Re(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = C.nextNode(), a++);
		}
		return C.currentNode = h, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, Pe = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = S, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
	}
	get parentNode() {
		let e = this._$AA.parentNode, t = this._$AM;
		return t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e;
	}
	get startNode() {
		return this._$AA;
	}
	get endNode() {
		return this._$AB;
	}
	_$AI(e, t = this) {
		e = w(this, e, t), _(e) ? e === S || e == null || e === "" ? (this._$AH !== S && this._$AR(), this._$AH = S) : e !== this._$AH && e !== x && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? Se(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== S && _(this._$AH) ? this._$AA.nextSibling.data = e : this.T(h.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = Me.createElement(Ae(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new Ne(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = ke.get(e.strings);
		return t === void 0 && ke.set(e.strings, t = new Me(e)), t;
	}
	k(t) {
		xe(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(g()), this.O(g()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = he(e).nextSibling;
			he(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, T = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = S, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = S;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = w(this, e, t, 0), a = !_(e) || e !== this._$AH && e !== x, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = w(this, r[n + o], t, o), s === x && (s = this._$AH[o]), a ||= !_(s) || s !== this._$AH[o], s === S ? e = S : e !== S && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === S ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Fe = class extends T {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === S ? void 0 : e;
	}
}, Ie = class extends T {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== S);
	}
}, Le = class extends T {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = w(this, e, t, 0) ?? S) === x) return;
		let n = this._$AH, r = e === S && n !== S || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== S && (n === S || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Re = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		w(this, e);
	}
}, ze = {
	M: ve,
	P: m,
	A: ye,
	C: 1,
	L: je,
	R: Ne,
	D: Se,
	V: w,
	I: Pe,
	H: T,
	N: Ie,
	U: Le,
	B: Fe,
	F: Re
}, Be = me.litHtmlPolyfillSupport;
Be?.(Me, Pe), (me.litHtmlVersions ??= []).push("3.3.3");
var Ve = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new Pe(t.insertBefore(g(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, He = globalThis, E = class extends p {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Ve(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return x;
	}
};
E._$litElement$ = !0, E.finalized = !0, He.litElementHydrateSupport?.({ LitElement: E });
var Ue = He.litElementPolyfillSupport;
Ue?.({ LitElement: E }), (He.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region node_modules/@lit/reactive-element/decorators/property.js
var We = {
	attribute: !0,
	type: String,
	converter: de,
	reflect: !1,
	hasChanged: fe
}, Ge = (e = We, t, n) => {
	let { kind: r, metadata: i } = n, a = globalThis.litPropertyMetadata.get(i);
	if (a === void 0 && globalThis.litPropertyMetadata.set(i, a = /* @__PURE__ */ new Map()), r === "setter" && ((e = Object.create(e)).wrapped = !0), a.set(n.name, e), r === "accessor") {
		let { name: r } = n;
		return {
			set(n) {
				let i = t.get.call(this);
				t.set.call(this, n), this.requestUpdate(r, i, e, !0, n);
			},
			init(t) {
				return t !== void 0 && this.C(r, void 0, e, t), t;
			}
		};
	}
	if (r === "setter") {
		let { name: r } = n;
		return function(n) {
			let i = this[r];
			t.call(this, n), this.requestUpdate(r, i, e, !0, n);
		};
	}
	throw Error("Unsupported decorator location: " + r);
};
function D(e) {
	return (t, n) => typeof n == "object" ? Ge(e, t, n) : ((e, t, n) => {
		let r = t.hasOwnProperty(n);
		return t.constructor.createProperty(n, e), r ? Object.getOwnPropertyDescriptor(t, n) : void 0;
	})(e, t, n);
}
//#endregion
//#region node_modules/@lit/reactive-element/decorators/state.js
function O(e) {
	return D({
		...e,
		state: !0,
		attribute: !1
	});
}
//#endregion
//#region src/velair/constants.ts
var k = [
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
	"sunday"
], Ke = [
	"heat",
	"cool",
	"heat_cool",
	"auto",
	"dry",
	"fan_only",
	"off"
], qe = "set_temperature", Je = "turn_off", Ye = "velair", Xe = 5e3, Ze = [
	"overview",
	"schedules",
	"templates",
	"settings"
], Qe = [
	"overview-status",
	"overview-boosts",
	"overview-events",
	"overview-timeline",
	"overview-zones",
	"schedules"
], $e = [
	"zones",
	"templates",
	"settings"
], et = /* @__PURE__ */ t({ en: () => tt }), tt = {
	addBlock: "Add block",
	apply: "Apply",
	cloneDayToDays: "Clone day to",
	cloneDayToThermostats: "Clone day to",
	cloneAction: "Clone",
	appliedDays: "Cloned to {count} day{suffix}",
	appliedTemplateTargets: "Applied to {count} targets",
	appliedThermostats: "Cloned to {count} thermostat{suffix}",
	applying: "Applying",
	applyTemplate: "Apply template",
	applyTo: "Apply to",
	applyToAction: "Apply to...",
	applyTemplateTo: "Apply {template} to...",
	boost: "Boost",
	boostActive: "Boost active",
	activeBoosts: "Active boosts",
	availableModes: "Available modes",
	boostTarget: "Boost target",
	boostUntil: "Ends in",
	blocks: "Blocks",
	build: "Build",
	cardView: "Card view",
	cardViewOverviewBoosts: "Overview: active boosts",
	cardViewOverviewEvents: "Overview: next events",
	cardViewOverviewStatus: "Overview: scheduler status",
	cardViewOverviewTimeline: "Overview: today's timeline",
	cardViewOverviewZones: "Overview: zone overview",
	cardViewSchedules: "Schedules editor",
	current: "Current",
	currentHumidity: "Humidity",
	currentTemperature: "Current temperature",
	currentTime: "Current time: {time}",
	clear: "Clear",
	confirmDeleteTemplate: "Delete template {template}?",
	confirmTemplate: "Replace {weekday} with {template}?",
	createTemplate: "Create template",
	customTemplateName: "Template name",
	day: "Day",
	daySchedule: "Day schedule",
	defaultZone: "First managed zone",
	deleteBlock: "Delete block",
	deleteTemplate: "Delete template",
	dismiss: "Dismiss",
	duplicateStart: "Duplicate start time: {start}",
	entityDiagnosticMissing: "Entity not found",
	entityDiagnosticNoModes: "No supported HVAC modes reported",
	entityDiagnosticNoRange: "No temperature range reported",
	entityDiagnosticNotClimate: "Entity is not a climate",
	entityDiagnosticOk: "Thermostat configuration looks OK",
	invalidStart: "Invalid start time: {start}",
	invalidTemperature: "Invalid temperature for {start}",
	invalidTemperatureRange: "Use {min} to {max}",
	invalidTemperatureStep: "Use 0.5 steps",
	keep: "Keep",
	keepMode: "Keep mode",
	tagline: "Climate automation that adapts to your life.",
	loading: "Loading scheduler data...",
	loadingEntities: "Loading managed zones...",
	managedEntityAvailable: "Available",
	managedEntityMissing: "Not found",
	managedEntitiesStatus: "Managed thermostats",
	menu: "Menu",
	providedData: "Provided data",
	portability: "Portability",
	portabilityDescription: "Export or import Velair data with a versioned JSON file.",
	portabilityFileReady: "{file} ready",
	portabilityIncluded: "Included",
	portabilitySettingsSection: "Settings",
	portabilityTemplatesSection: "Templates",
	portabilityZonesSection: "Thermostat schedules",
	portableExported: "Export file created",
	portableImported: "Import completed",
	importData: "Import",
	importFile: "Import file",
	chooseFile: "Choose file",
	noFileSelected: "No file selected",
	exportData: "Export",
	invalidImportFile: "This is not a valid Velair export file",
	importOverwriteWarning: "Importing will overwrite existing values. They cannot be recovered unless you exported them first.",
	noImportSections: "No importable sections found",
	maintenance: "Maintenance",
	maintenanceDescription: "Technical version details for troubleshooting.",
	frontendBuild: "Frontend build",
	portableFormatVersion: "Portable/export format",
	internalStorageVersion: "Storage/model",
	integrationVersion: "Integration version",
	resetVelair: "Reset Velair",
	resetVelairDescription: "Deletes stored schedules, templates, panel preferences, active boosts, and startup behavior, then recreates defaults for the currently managed thermostats.",
	confirmReset: "Reset all stored Velair data? This cannot be undone unless you exported your data first.",
	resetDone: "Velair data reset",
	resetting: "Resetting",
	minTemperature: "Minimum temperature",
	maxTemperature: "Maximum temperature",
	modeOptional: "Mode optional",
	firstWeekday: "First day of week",
	managedZones: "Managed zones",
	mode: "Mode",
	moveDown: "Move down",
	moveUp: "Move up",
	nextEvent: "Next event",
	nextEvents: "Next events",
	noActiveBoosts: "No active boosts",
	noBlocks: "No blocks",
	noManagedEntities: "No managed climate entities found.",
	noTemplates: "No templates",
	newTemplate: "New template",
	noUpcomingEvent: "No upcoming event",
	off: "Off",
	otherDays: "Other days",
	otherThermostats: "Other thermostats",
	overview: "Overview",
	overviewPanelIntro: "The main status view will group scheduler state, upcoming events, active boosts, and quick actions.",
	overviewStatusPaused: "Paused",
	overviewStatusPausedDetail: "Temporary pause active",
	overviewStatusRunning: "Running",
	overviewStatusRunningDetail: "Scheduler is applying schedules",
	overviewStatusStopped: "Stopped",
	overviewStatusStoppedDetail: "Scheduler is stopped until resumed",
	overviewZones: "Zone overview",
	pause: "Pause",
	pauseActive: "Paused",
	pauseApplied: "Scheduler paused",
	pauseDuration: "Pause duration (min)",
	pauseFrom: "From",
	pauseIndefinite: "No end time",
	pauseRemaining: "Resumes in",
	pauseTo: "To",
	resume: "Resume",
	resumed: "Scheduler resumed",
	resizeEnd: "Adjust end",
	resizeStart: "Adjust start",
	schedulerControls: "Scheduler controls",
	schedules: "Schedules",
	save: "Save",
	saveTemplate: "Save as template",
	saved: "Schedule saved",
	saving: "Saving",
	scheduleCopyHint: "You can also copy this configuration to another day or climate.",
	scheduleEditor: "Schedule editor",
	scheduleStepClimate: "1. Select the climate you want to configure.",
	scheduleStepConfigure: "3. Configure the climate to your liking.",
	scheduleStepDay: "2. Select the day you want to configure.",
	reorderZones: "Drag thermostats to change their order in the panel.",
	selectedWeekday: "Initial day",
	selectedZone: "Initial zone",
	selectTemplatePlaceholder: "Select a template",
	selectTemplateToBegin: "Select a template to begin.",
	setTemperature: "Set temperature",
	settings: "Settings",
	settingsPanelIntro: "Choose how thermostats and weekdays are ordered in this panel.",
	startupBehavior: "Home Assistant startup",
	applyScheduleOnStartup: "Apply active schedule after startup",
	applyScheduleOnStartupDescription: "When Home Assistant starts, Velair can apply the current schedule block to the managed thermostats instead of leaving them as they are.",
	start: "Start",
	status: "Status",
	stop: "Stop",
	supportedFanModes: "Fan modes",
	supportedPresetModes: "Presets",
	supportedSwingModes: "Swing modes",
	temp: "Temp",
	temperatureRange: "Temperature range",
	temperatureStep: "Step",
	targetTemp: "Target temp",
	targetTemperature: "Target temperature",
	todayTimeline: "Today's timeline",
	updateTemplate: "Update template",
	templateDeleted: "Template deleted",
	templateNameRequired: "Template name is required",
	templateOptionalHint: "Choose a template or manually configure the schedule.",
	templateSaved: "Template saved",
	templates: "Templates",
	thermostat: "Thermostat",
	templatesPanelIntro: "Template editing will move here so schedule editing stays focused.",
	time: "Time",
	timeline: "Timeline",
	title: "Title",
	unableApplyThermostats: "Unable to apply schedule to thermostats",
	unableCopy: "Unable to copy schedule",
	unableLoad: "Unable to load scheduler data",
	unablePause: "Unable to pause scheduler",
	unableResume: "Unable to resume scheduler",
	unableReset: "Unable to reset Velair data",
	unableSave: "Unable to save schedule",
	unableSaveSettings: "Unable to save settings",
	unableDeleteTemplate: "Unable to delete template",
	unableExport: "Unable to export data",
	unableSaveTemplate: "Unable to save template",
	unableSubscribe: "Unable to subscribe to scheduler updates",
	unsupportedModeForClimate: "{entity} does not support {mode} at {start}. Change that block to Keep or choose a supported mode before applying.",
	unsaved: "unsaved",
	waiting: "Waiting for scheduler data",
	zoneOrder: "Thermostat order",
	zonesManaged: "{count} zones managed",
	weekdays: {
		monday: "Monday",
		tuesday: "Tuesday",
		wednesday: "Wednesday",
		thursday: "Thursday",
		friday: "Friday",
		saturday: "Saturday",
		sunday: "Sunday"
	},
	schedulerStatuses: {
		idle: "Idle",
		override_active: "Boost active",
		paused: "Paused",
		scheduled: "Scheduled"
	},
	schedulerModes: {
		auto: "Auto",
		manual: "Manual",
		paused: "Paused",
		vacation: "Vacation"
	},
	hvacModes: {
		auto: "Auto",
		cool: "Cool",
		dry: "Dry",
		fan_only: "Fan only",
		heat: "Heat",
		heat_cool: "Heat/cool",
		off: "Off"
	},
	hvacActions: {
		cooling: "Cooling",
		drying: "Drying",
		fan: "Fan",
		heating: "Heating",
		idle: "Idle",
		off: "Off"
	}
}, nt = /* @__PURE__ */ t({ es: () => rt }), rt = {
	addBlock: "Añadir bloque",
	apply: "Aplicar",
	cloneDayToDays: "Clonar día a",
	cloneDayToThermostats: "Clonar día a",
	cloneAction: "Clonar",
	appliedDays: "Clonado a {count} día{suffix}",
	appliedTemplateTargets: "Plantilla aplicada a {count} destinos",
	appliedThermostats: "Clonado a {count} termostato{suffix}",
	applying: "Aplicando",
	applyTemplate: "Aplicar plantilla",
	applyTo: "Aplicar a",
	applyToAction: "Aplicar a...",
	applyTemplateTo: "Aplicar {template} a...",
	boost: "Refuerzo",
	boostActive: "Refuerzo activo",
	availableModes: "Modos disponibles",
	activeBoosts: "Refuerzos activos",
	boostTarget: "Objetivo del refuerzo",
	boostUntil: "Termina en",
	blocks: "Bloques",
	build: "Build",
	cardView: "Vista de card",
	cardViewOverviewBoosts: "Resumen: refuerzos activos",
	cardViewOverviewEvents: "Resumen: próximos eventos",
	cardViewOverviewStatus: "Resumen: estado del planificador",
	cardViewOverviewTimeline: "Resumen: línea de hoy",
	cardViewOverviewZones: "Resumen: zonas",
	cardViewSchedules: "Editor de planificación",
	current: "Actual",
	currentHumidity: "Humedad",
	currentTemperature: "Temperatura actual",
	currentTime: "Hora actual: {time}",
	clear: "Limpiar",
	confirmDeleteTemplate: "¿Eliminar la plantilla {template}?",
	confirmTemplate: "¿Reemplazar {weekday} por {template}?",
	createTemplate: "Crear plantilla",
	customTemplateName: "Nombre de la plantilla",
	day: "Día",
	daySchedule: "Planificación del día",
	defaultZone: "Primera zona gestionada",
	deleteBlock: "Eliminar bloque",
	deleteTemplate: "Eliminar plantilla",
	dismiss: "Cerrar",
	duplicateStart: "Hora duplicada: {start}",
	entityDiagnosticMissing: "Entidad no encontrada",
	entityDiagnosticNoModes: "No informa modos HVAC soportados",
	entityDiagnosticNoRange: "No informa rango de temperatura",
	entityDiagnosticNotClimate: "La entidad no es climate",
	entityDiagnosticOk: "La configuración del termostato parece correcta",
	invalidStart: "Hora no válida: {start}",
	invalidTemperature: "Temperatura no válida para {start}",
	invalidTemperatureRange: "Usa de {min} a {max}",
	invalidTemperatureStep: "Usa pasos de 0,5",
	keep: "Mantener",
	keepMode: "Mantener modo",
	tagline: "Climate automation that adapts to your life.",
	loading: "Cargando planificación...",
	loadingEntities: "Cargando zonas gestionadas...",
	managedEntityAvailable: "Disponible",
	managedEntityMissing: "No encontrada",
	managedEntitiesStatus: "Termostatos gestionados",
	menu: "Menú",
	providedData: "Datos disponibles",
	portability: "Portabilidad",
	portabilityDescription: "Exporta o importa datos de Velair con un archivo JSON versionado.",
	portabilityFileReady: "{file} preparado",
	portabilityIncluded: "Incluido",
	portabilitySettingsSection: "Ajustes",
	portabilityTemplatesSection: "Plantillas",
	portabilityZonesSection: "Planificación de termostatos",
	portableExported: "Archivo de exportación creado",
	portableImported: "Importación completada",
	importData: "Importar",
	importFile: "Archivo de importación",
	chooseFile: "Seleccionar archivo",
	noFileSelected: "Ningún archivo seleccionado",
	exportData: "Exportar",
	invalidImportFile: "Este no es un archivo de exportación válido de Velair",
	importOverwriteWarning: "Al importar se sobrescribirán valores existentes. No podrás recuperarlos salvo que hayas hecho un export previamente.",
	noImportSections: "No hay secciones importables",
	maintenance: "Mantenimiento",
	maintenanceDescription: "Detalles técnicos de versiones para diagnóstico.",
	frontendBuild: "Build del frontend",
	portableFormatVersion: "Formato portable/export",
	internalStorageVersion: "Storage/modelo",
	integrationVersion: "Versión de la integración",
	resetVelair: "Resetear Velair",
	resetVelairDescription: "Borra planificaciones, plantillas, preferencias del panel, refuerzos activos y comportamiento de arranque, y recrea los valores por defecto para los termostatos gestionados actualmente.",
	confirmReset: "¿Resetear todos los datos almacenados de Velair? No podrás deshacerlo salvo que hayas hecho un export previamente.",
	resetDone: "Datos de Velair reseteados",
	resetting: "Reseteando",
	minTemperature: "Temperatura mínima",
	maxTemperature: "Temperatura máxima",
	modeOptional: "Modo opcional",
	firstWeekday: "Primer día de la semana",
	managedZones: "Zonas gestionadas",
	mode: "Modo",
	moveDown: "Bajar",
	moveUp: "Subir",
	nextEvent: "Próximo evento",
	nextEvents: "Próximos eventos",
	noActiveBoosts: "Sin refuerzos activos",
	noBlocks: "Sin bloques",
	noManagedEntities: "No hay entidades climate gestionadas.",
	noTemplates: "Sin plantillas",
	newTemplate: "Nueva plantilla",
	noUpcomingEvent: "Sin próximos eventos",
	off: "Apagar",
	otherDays: "Otros días",
	otherThermostats: "Otros termostatos",
	overview: "Resumen",
	overviewPanelIntro: "La vista principal agrupará estado del planificador, próximos eventos, refuerzos activos y acciones rápidas.",
	overviewStatusPaused: "Pausado",
	overviewStatusPausedDetail: "Pausa temporal activa",
	overviewStatusRunning: "En ejecución",
	overviewStatusRunningDetail: "El planificador está aplicando la planificación",
	overviewStatusStopped: "Parado",
	overviewStatusStoppedDetail: "El planificador está parado hasta que se reanude",
	overviewZones: "Resumen de zonas",
	pause: "Pausar",
	pauseActive: "Pausado",
	pauseApplied: "Planificador pausado",
	pauseDuration: "Duración de pausa (min)",
	pauseFrom: "Desde",
	pauseIndefinite: "Sin hora de fin",
	pauseRemaining: "Se reanuda en",
	pauseTo: "Hasta",
	resume: "Reanudar",
	resumed: "Planificador reanudado",
	resizeEnd: "Ajustar fin",
	resizeStart: "Ajustar inicio",
	schedulerControls: "Controles del planificador",
	schedules: "Planificación",
	save: "Guardar",
	saveTemplate: "Guardar como plantilla",
	saved: "Planificación guardada",
	saving: "Guardando",
	scheduleCopyHint: "También puedes copiar esta configuración a otro día o climate.",
	scheduleEditor: "Editor de planificación",
	scheduleStepClimate: "1. Selecciona el climate que quieres configurar.",
	scheduleStepConfigure: "3. Configura el climate a tu gusto.",
	scheduleStepDay: "2. Selecciona el día que quieres configurar.",
	reorderZones: "Arrastra los termostatos para cambiar su orden en el panel.",
	selectedWeekday: "Día inicial",
	selectedZone: "Zona inicial",
	selectTemplatePlaceholder: "Selecciona una plantilla",
	selectTemplateToBegin: "Selecciona una plantilla para comenzar.",
	setTemperature: "Ajustar temperatura",
	settings: "Ajustes",
	settingsPanelIntro: "Elige el orden de los termostatos y de los días en este panel.",
	startupBehavior: "Inicio de Home Assistant",
	applyScheduleOnStartup: "Aplicar la planificación activa al arrancar",
	applyScheduleOnStartupDescription: "Cuando Home Assistant arranque, Velair puede aplicar el bloque programado vigente a los termostatos gestionados en lugar de dejarlos como estén.",
	start: "Hora",
	status: "Estado",
	stop: "Parar",
	supportedFanModes: "Modos de ventilador",
	supportedPresetModes: "Preajustes",
	supportedSwingModes: "Oscilación",
	temp: "Temp",
	temperatureRange: "Rango de temperatura",
	temperatureStep: "Paso",
	targetTemp: "Temp objetivo",
	targetTemperature: "Temperatura objetivo",
	todayTimeline: "Línea de hoy",
	updateTemplate: "Actualizar plantilla",
	templateDeleted: "Plantilla eliminada",
	templateNameRequired: "El nombre de la plantilla es obligatorio",
	templateOptionalHint: "Selecciona una plantilla o configura manualmente la planificación.",
	templateSaved: "Plantilla guardada",
	templates: "Plantillas",
	thermostat: "Termostato",
	templatesPanelIntro: "La edición de plantillas se moverá aquí para mantener clara la planificación.",
	time: "Hora",
	timeline: "Línea del día",
	title: "Título",
	unableApplyThermostats: "No se pudo aplicar la planificación a los termostatos",
	unableCopy: "No se pudo copiar la planificación",
	unableLoad: "No se pudieron cargar los datos",
	unablePause: "No se pudo pausar el planificador",
	unableResume: "No se pudo reanudar el planificador",
	unableReset: "No se pudieron resetear los datos de Velair",
	unableSave: "No se pudo guardar la planificación",
	unableSaveSettings: "No se pudieron guardar los ajustes",
	unableDeleteTemplate: "No se pudo eliminar la plantilla",
	unableExport: "No se pudo exportar la configuración",
	unableSaveTemplate: "No se pudo guardar la plantilla",
	unableSubscribe: "No se pudo suscribir a las actualizaciones",
	unsupportedModeForClimate: "{entity} no soporta el modo {mode} en {start}. Cambia ese bloque a Mantener o elige un modo compatible antes de aplicar.",
	unsaved: "sin guardar",
	waiting: "Esperando datos de planificación",
	zoneOrder: "Orden de termostatos",
	zonesManaged: "{count} zonas gestionadas",
	weekdays: {
		monday: "Lunes",
		tuesday: "Martes",
		wednesday: "Miércoles",
		thursday: "Jueves",
		friday: "Viernes",
		saturday: "Sábado",
		sunday: "Domingo"
	},
	schedulerStatuses: {
		idle: "En espera",
		override_active: "Refuerzo activo",
		paused: "Pausado",
		scheduled: "Programado"
	},
	schedulerModes: {
		auto: "Automático",
		manual: "Manual",
		paused: "Pausado",
		vacation: "Vacaciones"
	},
	hvacModes: {
		auto: "Automático",
		cool: "Frío",
		dry: "Secado",
		fan_only: "Ventilador",
		heat: "Calor",
		heat_cool: "Calor/frío",
		off: "Apagado"
	},
	hvacActions: {
		cooling: "Enfriando",
		drying: "Secando",
		fan: "Ventilando",
		heating: "Calentando",
		idle: "En espera",
		off: "Apagado"
	}
}, it = /* @__PURE__ */ t({ translationTemplate: () => at }), at = {
	addBlock: "",
	apply: "",
	cloneDayToDays: "",
	cloneDayToThermostats: "",
	cloneAction: "",
	appliedDays: "",
	appliedTemplateTargets: "",
	appliedThermostats: "",
	applying: "",
	applyTemplate: "",
	applyTo: "",
	applyToAction: "",
	applyTemplateTo: "",
	boost: "",
	boostActive: "",
	activeBoosts: "",
	availableModes: "",
	boostTarget: "",
	boostUntil: "",
	blocks: "",
	build: "",
	cardView: "",
	cardViewOverviewBoosts: "",
	cardViewOverviewEvents: "",
	cardViewOverviewStatus: "",
	cardViewOverviewTimeline: "",
	cardViewOverviewZones: "",
	cardViewSchedules: "",
	current: "",
	currentHumidity: "",
	currentTemperature: "",
	currentTime: "",
	clear: "",
	confirmDeleteTemplate: "",
	confirmTemplate: "",
	createTemplate: "",
	customTemplateName: "",
	day: "",
	daySchedule: "",
	defaultZone: "",
	deleteBlock: "",
	deleteTemplate: "",
	dismiss: "",
	duplicateStart: "",
	entityDiagnosticMissing: "",
	entityDiagnosticNoModes: "",
	entityDiagnosticNoRange: "",
	entityDiagnosticNotClimate: "",
	entityDiagnosticOk: "",
	invalidStart: "",
	invalidTemperature: "",
	invalidTemperatureRange: "",
	invalidTemperatureStep: "",
	keep: "",
	keepMode: "",
	tagline: "",
	loading: "",
	loadingEntities: "",
	managedEntityAvailable: "",
	managedEntityMissing: "",
	managedEntitiesStatus: "",
	menu: "",
	providedData: "",
	portability: "",
	portabilityDescription: "",
	portabilityFileReady: "",
	portabilityIncluded: "",
	portabilitySettingsSection: "",
	portabilityTemplatesSection: "",
	portabilityZonesSection: "",
	portableExported: "",
	portableImported: "",
	importData: "",
	importFile: "",
	chooseFile: "",
	noFileSelected: "",
	exportData: "",
	invalidImportFile: "",
	importOverwriteWarning: "",
	noImportSections: "",
	maintenance: "",
	maintenanceDescription: "",
	frontendBuild: "",
	portableFormatVersion: "",
	internalStorageVersion: "",
	integrationVersion: "",
	resetVelair: "",
	resetVelairDescription: "",
	confirmReset: "",
	resetDone: "",
	resetting: "",
	minTemperature: "",
	maxTemperature: "",
	modeOptional: "",
	firstWeekday: "",
	managedZones: "",
	mode: "",
	moveDown: "",
	moveUp: "",
	nextEvent: "",
	nextEvents: "",
	noActiveBoosts: "",
	noBlocks: "",
	noManagedEntities: "",
	noTemplates: "",
	newTemplate: "",
	noUpcomingEvent: "",
	off: "",
	otherDays: "",
	otherThermostats: "",
	overview: "",
	overviewPanelIntro: "",
	overviewStatusPaused: "",
	overviewStatusPausedDetail: "",
	overviewStatusRunning: "",
	overviewStatusRunningDetail: "",
	overviewStatusStopped: "",
	overviewStatusStoppedDetail: "",
	overviewZones: "",
	pause: "",
	pauseActive: "",
	pauseApplied: "",
	pauseDuration: "",
	pauseFrom: "",
	pauseIndefinite: "",
	pauseRemaining: "",
	pauseTo: "",
	resume: "",
	resumed: "",
	resizeEnd: "",
	resizeStart: "",
	schedulerControls: "",
	schedules: "",
	save: "",
	saveTemplate: "",
	saved: "",
	saving: "",
	scheduleCopyHint: "",
	scheduleEditor: "",
	scheduleStepClimate: "",
	scheduleStepConfigure: "",
	scheduleStepDay: "",
	reorderZones: "",
	selectedWeekday: "",
	selectedZone: "",
	selectTemplatePlaceholder: "",
	selectTemplateToBegin: "",
	setTemperature: "",
	settings: "",
	settingsPanelIntro: "",
	startupBehavior: "",
	applyScheduleOnStartup: "",
	applyScheduleOnStartupDescription: "",
	start: "",
	status: "",
	stop: "",
	supportedFanModes: "",
	supportedPresetModes: "",
	supportedSwingModes: "",
	temp: "",
	temperatureRange: "",
	temperatureStep: "",
	targetTemp: "",
	targetTemperature: "",
	todayTimeline: "",
	updateTemplate: "",
	templateDeleted: "",
	templateNameRequired: "",
	templateOptionalHint: "",
	templateSaved: "",
	templates: "",
	thermostat: "",
	templatesPanelIntro: "",
	time: "",
	timeline: "",
	title: "",
	unableApplyThermostats: "",
	unableCopy: "",
	unableLoad: "",
	unablePause: "",
	unableResume: "",
	unableReset: "",
	unableSave: "",
	unableSaveSettings: "",
	unableDeleteTemplate: "",
	unableExport: "",
	unableSaveTemplate: "",
	unableSubscribe: "",
	unsupportedModeForClimate: "",
	unsaved: "",
	waiting: "",
	zoneOrder: "",
	zonesManaged: "",
	weekdays: {
		monday: "",
		tuesday: "",
		wednesday: "",
		thursday: "",
		friday: "",
		saturday: "",
		sunday: ""
	},
	schedulerStatuses: {
		idle: "",
		override_active: "",
		paused: "",
		scheduled: ""
	},
	schedulerModes: {
		auto: "",
		manual: "",
		paused: "",
		vacation: ""
	},
	hvacModes: {
		auto: "",
		cool: "",
		dry: "",
		fan_only: "",
		heat: "",
		heat_cool: "",
		off: ""
	},
	hvacActions: {
		cooling: "",
		drying: "",
		fan: "",
		heating: "",
		idle: "",
		off: ""
	}
}, A = Object.fromEntries(Object.entries(/* @__PURE__ */ Object.assign({
	"./en.ts": et,
	"./es.ts": nt,
	"./template.ts": it,
	"./types.ts": /* @__PURE__ */ t({})
})).map(([e, t]) => {
	let n = e.match(/\.\/(.+)\.ts$/)?.[1] ?? "";
	return [n, t[n]];
}).filter(([e, t]) => !!(e && t && e !== "index" && e !== "template" && e !== "types")));
//#endregion
//#region src/velair/i18n.ts
function ot(e) {
	let t = e?.locale?.language ?? e?.language ?? e?.selectedLanguage ?? "en", n = String(t).toLowerCase();
	return Object.keys(A).find((e) => n === e || n.startsWith(`${e}-`)) ?? "en";
}
function st(e, t, n = {}) {
	let r = A[e][t] ?? A.en[t];
	if (typeof r != "string") return t;
	let i = r;
	return Object.entries(n).forEach(([e, t]) => {
		i = i.replaceAll(`{${e}}`, String(t));
	}), i;
}
function ct(e, t) {
	let n = A[e].weekdays, r = A.en.weekdays;
	return n[t] ?? r[t] ?? ft(t);
}
function lt(e, t) {
	return ct(e, t).slice(0, 3);
}
function ut(e, t, n) {
	let r = A[e][t], i = A.en[t];
	return r[n] ?? i[n] ?? dt(n);
}
function dt(e) {
	return e.split("_").filter(Boolean).map((e) => ft(e)).join(" ");
}
function ft(e) {
	return e && e[0].toUpperCase() + e.slice(1);
}
//#endregion
//#region src/velair/domain/climate.ts
function pt(e) {
	let t = e?.attributes;
	return JSON.stringify([
		e?.state ?? "",
		t?.current_temperature ?? null,
		t?.temperature ?? null,
		t?.hvac_action ?? "",
		t?.friendly_name ?? "",
		t?.unit_of_measurement ?? "",
		t?.hvac_modes ?? [],
		t?.min_temp ?? null,
		t?.max_temp ?? null,
		t?.target_temp_step ?? null,
		t?.current_humidity ?? null,
		t?.humidity ?? null,
		t?.preset_modes ?? [],
		t?.fan_modes ?? [],
		t?.swing_modes ?? []
	]);
}
function mt(e) {
	return e.replaceAll("_", "-");
}
function ht(e) {
	let t = bt(e?.attributes?.min_temp, 5), n = bt(e?.attributes?.max_temp, 35);
	return t < n ? [t, n] : [5, 35];
}
function gt(e) {
	let t = bt(e?.attributes?.target_temp_step, .5);
	return t > 0 ? t : .5;
}
function _t(e) {
	let t = e?.attributes?.hvac_modes;
	return Array.isArray(t) ? t.filter((e) => typeof e == "string") : [];
}
function vt(e) {
	let t = new Set(e);
	return Ke.filter((e) => t.has(e));
}
function yt(e) {
	let t = e?.attributes ?? {}, n = [];
	return typeof t.current_temperature == "number" && n.push({
		icon: "mdi:thermometer",
		labelKey: "currentTemperature"
	}), typeof t.temperature == "number" && n.push({
		icon: "mdi:thermostat",
		labelKey: "targetTemperature"
	}), (typeof t.current_humidity == "number" || typeof t.humidity == "number") && n.push({
		icon: "mdi:water-percent",
		labelKey: "currentHumidity"
	}), Array.isArray(t.preset_modes) && t.preset_modes.length && n.push({
		icon: "mdi:tune-variant",
		labelKey: "supportedPresetModes"
	}), Array.isArray(t.fan_modes) && t.fan_modes.length && n.push({
		icon: "mdi:fan",
		labelKey: "supportedFanModes"
	}), Array.isArray(t.swing_modes) && t.swing_modes.length && n.push({
		icon: "mdi:swap-vertical",
		labelKey: "supportedSwingModes"
	}), (typeof t.target_temp_low == "number" || typeof t.target_temp_high == "number") && n.push({
		icon: "mdi:thermometer-lines",
		labelKey: "temperatureRange"
	}), n;
}
function bt(e, t) {
	let n = Number(e);
	return Number.isFinite(n) ? n : t;
}
//#endregion
//#region src/velair/domain/settings.ts
function xt(e) {
	let t = e.first_weekday ?? e.selected_weekday ?? "monday";
	return k.includes(t) ? t : "monday";
}
function St(e) {
	let t = k.indexOf(e);
	return t <= 0 ? [...k] : [...k.slice(t), ...k.slice(0, t)];
}
function Ct(e, t = []) {
	let n = new Set(e), r = t.filter((e) => n.has(e)), i = e.filter((e) => !r.includes(e));
	return [...r, ...i];
}
function wt(e) {
	return e.length ? [Math.min(...e.map(([e]) => e)), Math.max(...e.map(([, e]) => e))] : [5, 35];
}
function Tt(e) {
	let t = e.filter((e) => Number.isFinite(e) && e > 0);
	return t.length ? Math.min(...t) : .5;
}
function Et(e) {
	return e.toFixed(e % 1 == 0 ? 0 : 1);
}
function Dt(e, t, n) {
	let r = new Set(e);
	return n ? r.add(t) : r.delete(t), r;
}
//#endregion
//#region src/velair/controllers/card-context.ts
function j(e) {
	return e;
}
function Ot(e) {
	return e.currentTarget.value;
}
function M(e) {
	return Ze.includes(e) || Qe.includes(e);
}
function kt(e, t, n) {
	return M(e) ? e : M(n) ? n : M(t) ? t : "overview-status";
}
function At(e, t, n) {
	if (!t) return !1;
	if (!n) return !0;
	let r = e._data?.configured_entities ?? [];
	return r.length ? r.some((e) => pt(t.states?.[e]) !== pt(n.states?.[e])) : !1;
}
function N(e) {
	return ot(e.hass);
}
function jt(e, t, n = {}) {
	return st(N(e), t, n);
}
function Mt(e, t) {
	return ct(N(e), t);
}
function Nt(e, t) {
	return lt(N(e), t);
}
function Pt(e, t, n) {
	return ut(N(e), t, n);
}
function Ft(e) {
	return xt(e._config);
}
function It(e) {
	return St(Ft(e));
}
function Lt(e, t) {
	return Ct(t, e._config.zone_order);
}
//#endregion
//#region src/velair/styles/base-styles.ts
var Rt = u`
  :host {
    display: block;
    max-width: 100%;
    min-width: 0;
  }

  :host(.timeline-resizing),
  :host(.timeline-resizing) * {
    cursor: ew-resize !important;
  }

  .card {
    box-sizing: border-box;
    color: var(--primary-text-color);
    container-type: inline-size;
    max-width: 100%;
    min-width: 0;
    padding: 16px;
    position: relative;
  }

  .card-scrim {
    -webkit-backdrop-filter: grayscale(0.85) saturate(0.55) brightness(0.72) blur(1px);
    backdrop-filter: grayscale(0.85) saturate(0.55) brightness(0.72) blur(1px);
    background: color-mix(in srgb, var(--primary-background-color, #000) 58%, transparent);
    border: 0;
    border-radius: var(--ha-card-border-radius, 12px);
    bottom: 0;
    cursor: default;
    left: 0;
    padding: 0;
    position: absolute;
    right: 0;
    top: 0;
    z-index: 1;
  }

  .header,
  .event,
  .section-title,
  .editor-header,
  .copy-header,
  .editor-actions,
  .title-actions {
    align-items: center;
    display: flex;
    gap: 12px;
    justify-content: space-between;
  }

  .title-actions {
    justify-content: flex-end;
    margin-top: 10px;
  }

  .section-heading {
    align-items: center;
    display: grid;
    gap: 10px;
    grid-template-columns: 28px minmax(0, 1fr);
    min-width: 0;
  }

  .section-heading ha-icon {
    --mdc-icon-size: 20px;
    color: var(--primary-color);
    justify-self: center;
  }

  .section-heading .section-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .section-label {
    color: var(--primary-text-color);
    display: block;
    font-weight: 600;
  }

  h2,
  h3,
  p {
    margin: 0;
  }

  h2 {
    font-size: 20px;
    font-weight: 600;
  }

  h3 {
    font-size: 16px;
    font-weight: 600;
  }

  .subtle,
  .label,
  .empty,
  .event span {
    color: var(--secondary-text-color);
    font-size: 12px;
  }

  .icon-button,
  .command-button {
    align-items: center;
    background: var(--secondary-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    color: var(--primary-text-color);
    cursor: pointer;
    display: inline-flex;
    justify-content: center;
  }

  .icon-button {
    height: 40px;
    width: 40px;
  }

  .command-button {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: var(--text-primary-color);
    flex: 0 1 auto;
    gap: 8px;
    min-width: 0;
    min-height: 40px;
    padding: 8px 12px;
  }

  .command-button span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .editor-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .command-button.primary {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: var(--text-primary-color);
  }

  .command-button.success {
    background: var(--success-color, #2e7d32);
    border-color: var(--success-color, #2e7d32);
    color: var(--text-primary-color);
  }

  .icon-button.success {
    background: var(--success-color, #2e7d32);
    border-color: var(--success-color, #2e7d32);
    color: var(--text-primary-color);
  }

  .icon-button.primary {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: var(--text-primary-color);
  }

  .command-button.warning {
    background: color-mix(in srgb, var(--warning-color, #f9a825) 16%, var(--card-background-color));
    border-color: color-mix(in srgb, var(--warning-color, #f9a825) 55%, var(--divider-color));
    color: var(--primary-text-color);
  }

  .command-button:disabled {
    cursor: default;
    opacity: 0.55;
  }

  .icon-button:disabled {
    cursor: default;
    opacity: 0.55;
  }

  .icon-button.danger {
    background: var(--error-color, #c62828);
    border-color: var(--error-color, #c62828);
  }

  .command-button.danger {
    background: var(--error-color, #c62828);
    border-color: var(--error-color, #c62828);
  }

  .icon-button.danger,
  .command-button.danger {
    color: var(--text-primary-color);
  }

  .command-button.compact {
    min-height: 34px;
    padding: 6px 10px;
  }
`, zt = u`
  .notice {
    align-items: center;
    animation: velair-notice-in 180ms ease-out;
    background: var(--secondary-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    bottom: 16px;
    box-shadow: var(--ha-card-box-shadow, 0 4px 18px rgba(0, 0, 0, 0.18));
    box-sizing: border-box;
    display: flex;
    gap: 10px;
    justify-content: space-between;
    left: 50%;
    margin: 0;
    max-width: min(520px, calc(100vw - 32px));
    min-width: min(320px, calc(100vw - 32px));
    overflow: hidden;
    padding: 12px;
    position: fixed;
    transform: translateX(-50%);
    width: max-content;
    z-index: 1000;
  }

  .notice-close {
    align-items: center;
    background: transparent;
    border: 0;
    color: currentColor;
    cursor: pointer;
    display: inline-flex;
    flex: 0 0 auto;
    height: 28px;
    justify-content: center;
    padding: 0;
    width: 28px;
  }

  .notice-close ha-icon {
    --mdc-icon-size: 18px;
  }

  .notice.error {
    background: color-mix(in srgb, var(--error-color) 12%, transparent);
    border-color: var(--error-color);
    bottom: 76px;
  }

  .notice.success {
    background: color-mix(in srgb, var(--success-color) 12%, transparent);
    border-color: var(--success-color);
    padding-bottom: 16px;
  }

  .notice-progress-track {
    background: color-mix(in srgb, var(--success-color, #2e7d32) 16%, var(--card-background-color));
    bottom: 0;
    height: 4px;
    left: 0;
    position: absolute;
    right: 0;
  }

  .notice-progress-fill {
    background: var(--success-color, #2e7d32);
    height: 100%;
    transition: width 500ms linear;
  }

  @keyframes velair-notice-in {
    from {
      opacity: 0;
      transform: translate(-50%, 14px);
    }

    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }
`, Bt = u`
.overview-summary {
  margin: 0;
}

.overview-status-card {
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  display: grid;
  gap: 12px;
  padding: 14px;
}

.overview-status-card.status-running {
  border-color: color-mix(in srgb, var(--success-color, #2e7d32) 38%, var(--divider-color));
}

.overview-status-card.status-paused {
  border-color: color-mix(in srgb, var(--warning-color, #f9a825) 58%, var(--divider-color));
}

.overview-status-card.status-stopped {
  border-color: color-mix(in srgb, var(--error-color, #c62828) 54%, var(--divider-color));
}

.overview-status-heading {
  align-items: center;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.overview-scheduler-state {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.overview-scheduler-state strong {
  font-size: 18px;
  line-height: 1.2;
}

.overview-state-value {
  align-items: center;
  display: inline-flex;
  gap: 6px;
  min-width: 0;
}

.overview-state-value ha-icon {
  --mdc-icon-size: 20px;
  flex: 0 0 auto;
}

.overview-state-value.running ha-icon {
  color: var(--success-color, #2e7d32);
}

.overview-state-value.paused ha-icon {
  color: var(--warning-color, #f9a825);
}

.overview-state-value.stopped ha-icon {
  color: var(--error-color, #c62828);
}

.overview-scheduler-detail {
  color: var(--secondary-text-color);
  font-size: 13px;
  grid-column: 1 / -1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.overview-status-card .pause-progress {
  border-radius: 0;
  position: static;
}

.overview-status-card .pause-progress span {
  padding: 0 0 2px;
}

.overview-controls {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: end;
  justify-self: end;
  max-width: 100%;
}

.overview-pause-control {
  display: grid;
  width: fit-content;
}

.overview-pause-input {
  --overview-pause-digits: 6ch;
  align-items: stretch;
  background: var(--card-background-color);
  border: 1px solid #c99500;
  border-radius: 8px;
  display: grid;
  grid-template-columns: calc(var(--overview-pause-digits) + 18px) 28px 34px;
  height: 36px;
  width: fit-content;
}

.overview-pause-input input {
  background: transparent;
  border: 0;
  box-sizing: border-box;
  color: var(--primary-text-color);
  font: inherit;
  font-size: 14px;
  height: 100%;
  margin-top: 0;
  min-width: 0;
  padding: 0 8px;
  width: calc(var(--overview-pause-digits) + 18px);
}

.overview-pause-input input:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: -2px;
}

.overview-pause-unit {
  align-items: center;
  color: var(--secondary-text-color);
  display: inline-flex;
  font-size: 12px;
  justify-content: center;
}

.overview-inline-button {
  align-items: center;
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  color: var(--primary-text-color);
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  height: 36px;
  justify-content: center;
  min-width: 36px;
  padding: 0;
  white-space: nowrap;
}

.overview-pause-input .overview-inline-button {
  border-block: 0;
  border-inline-end: 0;
  border-inline-start: 0;
  border-radius: 0;
  border-top-right-radius: 7px;
  border-bottom-right-radius: 7px;
  height: 100%;
  min-width: 34px;
}

.overview-inline-button.warning {
  background: #c99500;
  border-color: #c99500;
  color: var(--text-primary-color);
}

.overview-inline-button.resume {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: var(--text-primary-color);
}

.overview-inline-button.danger {
  background: var(--error-color, #c62828);
  border-color: var(--error-color, #c62828);
  color: var(--text-primary-color);
}

.overview-inline-button:disabled {
  cursor: default;
  opacity: 0.55;
}

.overview-boost-panel {
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  display: grid;
  gap: 10px;
  margin-top: 14px;
  min-width: 0;
  padding: 12px;
}

.overview-boost-list {
  display: grid;
  gap: 8px;
  grid-template-columns: 1fr;
}

.overview-muted {
  color: var(--secondary-text-color);
  font-size: 13px;
}

.overview-timeline-panel {
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  display: grid;
  gap: 10px;
  isolation: isolate;
  margin-top: 14px;
  min-width: 0;
  padding: 12px;
  position: relative;
  z-index: 0;
}

.overview-timeline-scroll {
  min-width: 0;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  padding-bottom: 8px;
  position: relative;
  scrollbar-gutter: stable;
}

.overview-timeline-layout {
  display: grid;
  grid-template-columns: minmax(128px, 168px) minmax(480px, 1fr);
  min-width: 620px;
}

.overview-timeline-names,
.overview-timeline-rows {
  display: grid;
  gap: 8px;
  grid-auto-rows: 34px;
  min-width: 0;
}

.overview-timeline-names {
  background: var(--secondary-background-color);
  left: 0;
  padding-right: 8px;
  position: sticky;
  z-index: 7;
}

.overview-timeline-axis,
.overview-timeline-axis-spacer {
  min-height: 22px;
}

.overview-timeline-axis-spacer {
  grid-row: 1;
}

.overview-timeline-axis {
  color: var(--secondary-text-color);
  font-size: 11px;
  position: relative;
}

.overview-timeline-axis > span {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
}

.overview-timeline-axis > span:nth-of-type(1) {
  left: 0;
  transform: translateY(-50%);
}

.overview-timeline-axis > span:nth-of-type(2) {
  left: 25%;
}

.overview-timeline-axis > span:nth-of-type(3) {
  left: 50%;
}

.overview-timeline-axis > span:nth-of-type(4) {
  left: 75%;
}

.overview-timeline-axis > span:nth-of-type(5) {
  left: 100%;
  transform: translate(-100%, -50%);
}

.overview-timeline-now-label {
  background: color-mix(in srgb, var(--card-background-color) 84%, var(--primary-color) 16%);
  border: 1px solid color-mix(in srgb, var(--primary-color) 58%, var(--divider-color));
  border-radius: 999px;
  color: var(--primary-text-color);
  font-size: 10px;
  font-weight: 600;
  left: clamp(26px, var(--overview-now-left), calc(100% - 26px));
  line-height: 1;
  padding: 2px 5px;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  white-space: nowrap;
  z-index: 3;
}

.overview-timeline-rows {
  position: relative;
}

.overview-timeline-now-line {
  bottom: 0;
  left: var(--overview-now-left);
  pointer-events: none;
  position: absolute;
  top: 22px;
  transform: translateX(-50%);
  width: 2px;
  z-index: 2;
}

.overview-timeline-now-line::before {
  background: color-mix(in srgb, var(--primary-color) 76%, var(--card-background-color));
  border-radius: 999px;
  bottom: 0;
  content: "";
  left: 0;
  position: absolute;
  top: 0;
  width: 2px;
}

.overview-timeline-name {
  align-items: center;
  background: var(--secondary-background-color);
  border-bottom: 1px solid var(--divider-color);
  display: flex;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-timeline-name span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.overview-timeline-name ha-icon {
  --mdc-icon-size: 16px;
  color: var(--secondary-text-color);
  flex: 0 0 auto;
}

.overview-timeline-name.paused {
  color: var(--secondary-text-color);
}

.overview-timeline-name.paused ha-icon {
  color: var(--warning-color, #c99500);
}

.overview-timeline-track {
  background:
    linear-gradient(to right, var(--divider-color) 1px, transparent 1px) 0 0 / 25% 100%,
    var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  min-width: 0;
  overflow: visible;
  position: relative;
}

.overview-timeline-track.paused-indefinite .overview-timeline-block,
.overview-timeline-track.paused-indefinite .overview-timeline-boost {
  filter: grayscale(0.9) saturate(0.35);
}

.overview-timeline-block {
  align-items: center;
  background: var(--timeline-bg, color-mix(in srgb, var(--primary-color) 20%, var(--card-background-color)));
  border: 1px solid var(--timeline-border, color-mix(in srgb, var(--primary-color) 48%, var(--divider-color)));
  border-radius: 8px;
  bottom: 0;
  box-sizing: border-box;
  color: var(--primary-text-color);
  cursor: pointer;
  display: flex;
  min-width: 0;
  overflow: hidden;
  padding: 0 7px;
  position: absolute;
  text-align: left;
  top: 0;
  z-index: 3;
}

.overview-timeline-pause {
  align-items: center;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--card-background-color) 84%, var(--secondary-text-color) 16%) 0%,
      color-mix(in srgb, var(--card-background-color) 84%, var(--secondary-text-color) 16%) 42%,
      color-mix(in srgb, var(--card-background-color) 70%, var(--secondary-text-color) 30%) 42%,
      color-mix(in srgb, var(--card-background-color) 70%, var(--secondary-text-color) 30%) 58%,
      color-mix(in srgb, var(--card-background-color) 84%, var(--secondary-text-color) 16%) 58%,
      color-mix(in srgb, var(--card-background-color) 84%, var(--secondary-text-color) 16%) 100%
    ) 0 0 / 14px 14px,
    color-mix(in srgb, var(--card-background-color) 74%, var(--secondary-text-color) 26%);
  border: 1px solid color-mix(in srgb, var(--secondary-text-color) 58%, var(--divider-color));
  border-radius: 8px;
  bottom: 0;
  box-sizing: border-box;
  color: var(--primary-text-color);
  cursor: pointer;
  display: flex;
  justify-content: center;
  min-width: 0;
  overflow: hidden;
  padding: 0 7px;
  position: absolute;
  text-align: center;
  top: 0;
  z-index: 5;
}

.overview-timeline-pause.indefinite {
  border-style: dashed;
}

.overview-timeline-pause ha-icon {
  --mdc-icon-size: 13px;
  color: var(--warning-color, #c99500);
  flex: 0 0 auto;
}

.overview-timeline-boost {
  align-items: center;
  background: color-mix(in srgb, var(--timeline-handle, var(--primary-color)) 12%, var(--card-background-color));
  border: 2px solid color-mix(in srgb, var(--timeline-handle, var(--primary-color)) 86%, var(--card-background-color));
  border-radius: 8px;
  bottom: 0;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--card-background-color) 70%, transparent),
    0 0 10px color-mix(in srgb, var(--timeline-handle, var(--primary-color)) 28%, transparent);
  box-sizing: border-box;
  color: var(--primary-text-color);
  cursor: pointer;
  display: flex;
  isolation: isolate;
  min-width: 0;
  overflow: hidden;
  padding: 0 7px;
  position: absolute;
  text-align: left;
  top: 0;
  z-index: 4;
}

.overview-timeline-boost::before,
.overview-timeline-boost::after {
  animation: velair-overview-boost-bars 4.8s linear infinite;
  background:
    linear-gradient(
      110deg,
      transparent 0%,
      color-mix(in srgb, var(--timeline-handle, var(--primary-color)) 18%, transparent) 28%,
      color-mix(in srgb, var(--timeline-handle, var(--primary-color)) 58%, transparent) 50%,
      color-mix(in srgb, var(--timeline-handle, var(--primary-color)) 18%, transparent) 72%,
      transparent 100%
    );
  content: "";
  inset: -1px auto -1px 0;
  opacity: 0;
  pointer-events: none;
  position: absolute;
  width: 42%;
  z-index: -1;
}

.overview-timeline-boost::after {
  animation-delay: -2.4s;
}

.overview-timeline-boost ha-icon {
  --mdc-icon-size: 13px;
  color: var(--timeline-handle, var(--primary-color));
  flex: 0 0 auto;
}

.overview-timeline-block-main {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0 4px;
  line-height: 1.1;
  max-width: 100%;
  overflow: hidden;
  pointer-events: none;
  position: relative;
  z-index: 1;
}

.overview-timeline-block-main > span,
.overview-timeline-block-main > small {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-timeline-block-main > span {
  font-size: 11px;
}

.overview-timeline-block-main > small {
  font-size: 10px;
}

.overview-timeline-block.compact .overview-timeline-block-main > small,
.overview-timeline-block.tiny .overview-timeline-block-main {
  display: none;
}

@keyframes velair-overview-boost-bars {
  0% {
    opacity: 0;
    transform: translateX(-130%);
  }

  14% {
    opacity: 1;
  }

  86% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translateX(260%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .overview-timeline-boost::before,
  .overview-timeline-boost::after {
    animation: none;
  }
}

.overview-timeline-tap-detail {
  align-items: center;
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0, 0, 0, 0.16));
  box-sizing: border-box;
  color: var(--primary-text-color);
  display: none;
  gap: 8px;
  max-width: min(calc(100% - 16px), 360px);
  min-width: 0;
  padding: 8px 8px 8px 10px;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 6;
}

.overview-timeline-tap-detail.align-start {
  left: max(8px, var(--overview-detail-left, 50%));
}

.overview-timeline-tap-detail.align-center {
  left: clamp(88px, var(--overview-detail-left, 50%), calc(100% - 88px));
  transform: translate(-50%, -50%);
}

.overview-timeline-tap-detail.align-end {
  right: max(8px, calc(100% - var(--overview-detail-left, 50%)));
}

.overview-timeline-tap-detail span {
  flex: 1 1 auto;
  font-size: 12px;
  min-width: 0;
}

.overview-timeline-tap-detail button {
  align-items: center;
  background: transparent;
  border: 0;
  color: var(--secondary-text-color);
  cursor: pointer;
  display: inline-flex;
  flex: 0 0 auto;
  height: 24px;
  justify-content: center;
  padding: 0;
  width: 24px;
}

.overview-timeline-tap-detail ha-icon {
  --mdc-icon-size: 16px;
}

@media (hover: none), (pointer: coarse) {
  .overview-timeline-tap-detail {
    display: flex;
  }
}

.overview-timeline-empty {
  align-items: center;
  color: var(--secondary-text-color);
  display: flex;
  font-size: 12px;
  height: 100%;
  padding: 0 10px;
}

.overview-zones {
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  display: grid;
  gap: 10px;
  margin-top: 14px;
  min-width: 0;
  padding: 12px;
}

.overview-section-title {
  grid-column: 1 / -1;
  padding: 0 2px;
}

.panel-empty.embedded {
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  padding: 12px;
}

.overview-zone-table-scroll {
  min-width: 0;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  padding-bottom: 8px;
  scrollbar-gutter: stable;
}

.overview-zone-table {
  display: grid;
  grid-template-columns:
    minmax(148px, 190px)
    minmax(120px, 0.75fr)
    minmax(230px, 1.35fr)
    minmax(190px, 1.25fr);
  min-width: 680px;
}

.overview-zone-table-row {
  display: contents;
}

.overview-zone-cell {
  align-items: center;
  background: var(--card-background-color);
  border-top: 1px solid var(--divider-color);
  display: flex;
  gap: 6px;
  min-height: 42px;
  min-width: 0;
  padding: 8px 10px;
}

.overview-zone-table-row.header .overview-zone-cell {
  background: var(--secondary-background-color);
  border-top: 0;
  color: var(--secondary-text-color);
  font-size: 11px;
  font-weight: 700;
  min-height: 28px;
  text-transform: uppercase;
}

.overview-zone-cell.sticky {
  border-right: 1px solid var(--divider-color);
  left: 0;
  position: sticky;
  z-index: 2;
}

.overview-zone-table-row.header .overview-zone-cell.sticky {
  z-index: 3;
}

.overview-zone-cell.name {
  align-items: start;
  flex-direction: column;
  gap: 2px;
}

.overview-zone-cell.name strong,
.overview-zone-cell.name span,
.overview-zone-setpoint,
.overview-zone-state,
.overview-mode-value,
.overview-mode-value span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-zone-cell.name strong {
  max-width: 100%;
}

.overview-zone-cell.name span {
  color: var(--secondary-text-color);
  font-size: 11px;
  max-width: 100%;
}

.overview-zone-setpoint {
  align-items: center;
  display: grid;
  gap: 7px;
  max-width: 100%;
  min-width: 0;
}

.overview-zone-setpoint.overridden {
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
}

.overview-zone-state {
  display: grid;
  gap: 3px;
  line-height: 1.2;
}

.overview-zone-state.previous {
  color: var(--secondary-text-color);
}

.overview-zone-state.previous strong,
.overview-zone-state.previous span {
  text-decoration: line-through;
}

.overview-zone-transition {
  align-items: center;
  display: flex;
  justify-content: center;
  min-width: 28px;
}

.overview-zone-transition-symbol {
  align-items: center;
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 999px;
  box-sizing: border-box;
  display: grid;
  justify-items: center;
  min-width: 28px;
  padding: 2px 4px;
}

.overview-zone-transition-symbol ha-icon {
  --mdc-icon-size: 15px;
  flex: 0 0 auto;
}

.overview-zone-transition .overview-zone-cause {
  margin-bottom: -2px;
}

.overview-zone-transition .overview-zone-arrow {
  color: var(--secondary-text-color);
}

.overview-zone-setpoint.boost .overview-zone-cause,
.overview-zone-status.boost ha-icon {
  color: var(--warning-color, #f9a825);
}

.overview-zone-setpoint.pause .overview-zone-cause,
.overview-zone-status.pause ha-icon {
  color: var(--warning-color, #c99500);
}

.overview-zone-status {
  align-items: flex-start;
  display: inline-flex;
  gap: 6px;
  line-height: 1.35;
  max-width: 100%;
  min-width: 0;
  white-space: normal;
}

.overview-zone-status span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.overview-zone-status ha-icon {
  --mdc-icon-size: 16px;
  flex: 0 0 auto;
}

.overview-mode-value {
  align-items: center;
  display: inline-flex;
  line-height: 1.2;
  min-width: 0;
}

.overview-mode-value span {
  overflow: hidden;
  line-height: 1.2;
  text-overflow: ellipsis;
}

.overview-boost-status {
  align-items: center;
  background: color-mix(in srgb, var(--warning-color, #f9a825) 14%, var(--card-background-color));
  border: 1px solid color-mix(in srgb, var(--warning-color, #f9a825) 44%, var(--divider-color));
  border-radius: 8px;
  color: var(--primary-text-color);
  display: grid;
  gap: 10px;
  grid-template-columns: auto minmax(0, 1fr);
  min-width: 0;
  padding: 10px;
}

.overview-boost-status ha-icon {
  color: var(--warning-color, #f9a825);
}

.overview-boost-status strong,
.overview-boost-status span {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-empty.embedded {
  align-items: center;
  display: grid;
  gap: 16px;
  grid-template-columns: auto minmax(0, 1fr);
}

.panel-empty.embedded ha-icon {
  color: var(--primary-color);
  height: 28px;
  width: 28px;
}

.event-list,
.draft-list,
.copy-targets {
  display: grid;
  gap: 8px;
}

.event-list {
  min-width: 0;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  padding-bottom: 8px;
  scrollbar-gutter: stable;
}

.next .event-list {
  margin-top: 10px;
}

.draft-empty {
  align-items: center;
  background: var(--card-background-color);
  border: 1px dashed var(--divider-color);
  border-radius: 8px;
  display: flex;
  justify-content: center;
  min-height: 46px;
  padding: 10px;
  text-align: center;
}

.event {
  align-items: center;
  border-top: 1px solid var(--divider-color);
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(110px, 1fr) max-content;
  min-width: 0;
  padding-top: 8px;
}

.event > div:first-child {
  min-width: 0;
}

.event > div:first-child strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-details {
  align-items: center;
  display: grid;
  gap: 8px;
  grid-template-columns: 18ch 8ch 12ch;
  justify-content: end;
  min-width: 0;
  width: max-content;
}

.event-details strong,
.event-details span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-details strong {
  color: var(--primary-text-color);
  font-size: 14px;
  text-align: end;
}

.event-time {
  color: var(--secondary-text-color);
}

.event-target {
  justify-self: end;
}

.event-mode {
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 999px;
  justify-self: end;
  line-height: 1;
  padding: 3px 7px;
}

.event:first-of-type {
  border-top: 0;
  padding-top: 0;
}

.summary-icon-button {
  align-items: center;
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  color: var(--primary-text-color);
  cursor: pointer;
  display: inline-flex;
  height: 34px;
  justify-content: center;
  list-style: none;
  width: 34px;
}

.summary-icon-button:hover {
  background: color-mix(in srgb, var(--primary-color) 12%, var(--secondary-background-color));
  border-color: color-mix(in srgb, var(--primary-color) 38%, var(--divider-color));
}

.summary-icon-button ha-icon {
  --mdc-icon-size: 18px;
}
`, Vt = u`
  .settings-portability {
    display: grid;
    gap: 12px;
  }

  .settings-portability-heading {
    align-items: center;
    display: grid;
    gap: 12px;
    grid-template-columns: 36px minmax(0, 1fr);
  }

  .settings-portability p {
    color: var(--secondary-text-color);
    font-size: 12px;
    margin: 4px 0 0;
  }

  .portability-grid {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    min-width: 0;
  }

  .portability-card {
    align-content: start;
    background: var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    display: grid;
    gap: 10px;
    min-width: 0;
    padding: 10px;
  }

  .portability-options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
  }

  .portable-option {
    align-items: center;
    background: var(--secondary-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 999px;
    color: var(--primary-text-color);
    display: inline-flex;
    gap: 6px;
    min-height: 30px;
    padding: 0 10px;
  }

  .portable-option input {
    accent-color: var(--primary-color);
    margin: 0;
    min-height: 0;
    padding: 0;
    width: auto;
  }

  .portable-option span {
    color: inherit;
    font-size: 12px;
    margin: 0;
    white-space: nowrap;
  }

  .portable-option strong {
    color: var(--primary-text-color);
    font-size: 12px;
    font-weight: 700;
    margin: 0;
  }

  .portable-file-field {
    cursor: pointer;
    display: grid;
    gap: 6px;
  }

  .portable-file-control {
    align-items: center;
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    display: flex;
    min-height: 38px;
    min-width: 0;
    overflow: hidden;
  }

  .portable-file-control input {
    height: 1px;
    opacity: 0;
    overflow: hidden;
    position: absolute;
    width: 1px;
  }

  .portable-file-button {
    align-items: center;
    align-self: stretch;
    background: var(--primary-color);
    color: var(--text-primary-color);
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 13px;
    font-weight: 600;
    padding: 0 12px;
    white-space: nowrap;
  }

  .portable-file-name {
    color: var(--secondary-text-color);
    flex: 1 1 auto;
    font-size: 13px;
    min-width: 0;
    overflow: hidden;
    padding: 0 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .portable-warning {
    align-items: start;
    background: color-mix(in srgb, var(--warning-color, #c99500) 14%, var(--card-background-color));
    border: 1px solid color-mix(in srgb, var(--warning-color, #c99500) 58%, var(--divider-color));
    border-radius: 8px;
    color: var(--primary-text-color);
    display: grid;
    font-size: 12px;
    gap: 8px;
    grid-template-columns: 18px minmax(0, 1fr);
    padding: 8px;
  }

  .portable-warning ha-icon {
    --mdc-icon-size: 18px;
    color: var(--warning-color, #c99500);
  }
`, Ht = u`
.settings-view {
  display: grid;
  gap: 12px;
  margin-top: 0;
  min-width: 0;
}

.settings-field,
.settings-zone-order,
.settings-portability,
.settings-maintenance,
.settings-reset,
.settings-startup {
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  min-width: 0;
  padding: 12px;
}

.settings-field {
  display: block;
}

.settings-startup {
  align-items: center;
  display: grid;
  gap: 12px;
  grid-template-columns: 36px minmax(0, 1fr) auto;
}

.settings-startup ha-switch {
  justify-self: end;
}

.settings-startup-icon {
  --mdc-icon-size: 24px;
  color: var(--primary-color);
  justify-self: center;
}

.settings-startup-copy {
  min-width: 0;
}

.settings-maintenance {
  display: grid;
  gap: 12px;
}

.maintenance-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  min-width: 0;
}

.maintenance-item {
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 10px;
}

.maintenance-item strong {
  color: var(--primary-text-color);
  font-size: 14px;
  min-width: 0;
  overflow-wrap: anywhere;
}

.settings-reset {
  align-items: center;
  display: grid;
  gap: 12px;
  grid-template-columns: 36px minmax(0, 1fr) auto;
}

.settings-reset-icon {
  --mdc-icon-size: 24px;
  color: var(--error-color);
  justify-self: center;
}

.settings-reset-copy {
  min-width: 0;
}

.settings-reset .command-button {
  justify-self: end;
  width: auto;
}

.section-label {
  color: var(--primary-text-color);
  display: block;
  font-weight: 600;
}

.settings-zone-order p,
.settings-maintenance p,
.settings-reset p,
.settings-startup p {
  color: var(--secondary-text-color);
  font-size: 12px;
  margin: 4px 0 0;
}

.settings-zone-order > .section-heading {
  grid-template-columns: 36px minmax(0, 1fr);
}

.settings-zone-list {
  display: grid;
  gap: 8px;
  margin-top: 10px;
  min-width: 0;
}

.settings-zone-row {
  align-items: start;
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  cursor: grab;
  display: grid;
  gap: 8px;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  min-width: 0;
  padding: 10px;
}

.settings-zone-row:active {
  cursor: grabbing;
}

.settings-zone-main {
  align-items: start;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(150px, 0.75fr) minmax(220px, 1.25fr) minmax(240px, 1fr);
  min-width: 0;
}

.settings-zone-identity {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.settings-zone-title {
  align-items: center;
  display: grid;
  gap: 7px;
  grid-template-columns: 10px minmax(0, 1fr);
  min-width: 0;
}

.settings-zone-identity strong,
.settings-zone-identity span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-zone-identity span {
  color: var(--secondary-text-color);
  font-size: 12px;
}

.settings-diagnostic-dot {
  border-radius: 50%;
  display: inline-block;
  height: 8px;
  width: 8px;
}

.settings-diagnostic-dot.ok {
  background: var(--success-color, #2e7d32);
}

.settings-diagnostic-dot.warning {
  background: var(--warning-color, #c99500);
}

.settings-diagnostic-dot.error {
  background: var(--error-color, #c62828);
}

.settings-zone-identity .settings-diagnostic-text {
  white-space: normal;
}

.settings-diagnostic-text.warning {
  color: var(--warning-color, #c99500);
}

.settings-diagnostic-text.error {
  color: var(--error-color, #c62828);
}

.settings-entity-status.ok {
  color: var(--success-color, #2e7d32);
}

.settings-entity-status.warning {
  color: var(--error-color, #c62828);
}

.settings-capability-section {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.settings-mode-tags,
.settings-data-icons,
.settings-facts,
.settings-capability-composite {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.settings-capability-composite {
  align-items: flex-start;
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(150px, auto) minmax(90px, 1fr);
}

.settings-facts span {
  align-items: center;
  color: var(--secondary-text-color);
  display: inline-flex;
  font-size: 12px;
  gap: 4px;
  min-width: 0;
}

.settings-facts ha-icon,
.settings-data-icons ha-icon {
  --mdc-icon-size: 16px;
  color: var(--secondary-text-color);
}

.settings-data-icons span {
  align-items: center;
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 999px;
  display: inline-flex;
  height: 26px;
  justify-content: center;
  width: 26px;
}

.mode-chip {
  background: var(--timeline-bg, color-mix(in srgb, var(--primary-color) 12%, var(--card-background-color)));
  border: 1px solid var(--timeline-border, color-mix(in srgb, var(--primary-color) 36%, var(--divider-color)));
  border-radius: 999px;
  color: var(--primary-text-color);
  display: inline-flex;
  font-size: 12px;
  line-height: 1;
  padding: 5px 8px;
  white-space: nowrap;
}

.mode-chip.mode-heat {
  --timeline-bg: color-mix(in srgb, #d95f24 18%, var(--card-background-color));
  --timeline-border: color-mix(in srgb, #d95f24 48%, var(--divider-color));
}

.mode-chip.mode-cool {
  --timeline-bg: color-mix(in srgb, #2d7dd2 18%, var(--card-background-color));
  --timeline-border: color-mix(in srgb, #2d7dd2 48%, var(--divider-color));
}

.mode-chip.mode-heat-cool {
  --timeline-bg: color-mix(in srgb, #6f7f91 16%, var(--card-background-color));
  --timeline-border: color-mix(in srgb, #6f7f91 45%, var(--divider-color));
}

.mode-chip.mode-auto {
  --timeline-bg: color-mix(in srgb, #6f7f91 18%, var(--card-background-color));
  --timeline-border: color-mix(in srgb, #6f7f91 45%, var(--divider-color));
}

.mode-chip.mode-dry {
  --timeline-bg: color-mix(in srgb, #b4872b 16%, var(--card-background-color));
  --timeline-border: color-mix(in srgb, #b4872b 42%, var(--divider-color));
}

.mode-chip.mode-fan-only {
  --timeline-bg: color-mix(in srgb, #2f8f83 16%, var(--card-background-color));
  --timeline-border: color-mix(in srgb, #2f8f83 42%, var(--divider-color));
}

.mode-chip.mode-off {
  --timeline-bg: color-mix(in srgb, var(--disabled-text-color) 16%, var(--card-background-color));
  --timeline-border: color-mix(in srgb, var(--disabled-text-color) 42%, var(--divider-color));
}

.settings-row-actions {
  display: inline-flex;
  gap: 4px;
}

.settings-row-actions .icon-button {
  height: 34px;
  width: 34px;
}
`, Ut = u`
.template-library {
  display: grid;
  gap: 12px;
  margin-top: 0;
  min-width: 0;
}

.template-detail-heading {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  min-width: 0;
}

.template-name-field {
  min-width: 0;
}

.template-item strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-library-layout {
  align-items: start;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(220px, 0.85fr) minmax(0, 1.65fr);
  min-width: 0;
}

.template-list-wrap,
.template-detail {
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  min-width: 0;
  padding: 12px;
}

.template-list-wrap {
  min-height: 0;
  position: relative;
}

.template-list-heading {
  align-items: center;
  display: flex;
  gap: 10px;
  justify-content: space-between;
  margin-bottom: 10px;
  min-width: 0;
}

.template-list-heading strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-list-heading .section-heading {
  flex: 1 1 auto;
}

.template-list-heading .icon-button {
  height: 34px;
  margin-right: 14px;
  width: 34px;
}

.template-list,
.template-block-list {
  display: grid;
  gap: 8px;
}

.template-item {
  align-items: center;
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  color: var(--primary-text-color);
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) 40px;
  min-width: 0;
  padding: 8px;
}

.template-item-main {
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  display: grid;
  gap: 3px;
  min-width: 0;
  padding: 2px;
  text-align: left;
}

.template-item-main span,
.template-block small {
  color: var(--secondary-text-color);
  font-size: 12px;
}

.template-item .icon-button.danger.template-item-delete {
  background: transparent;
  border-color: transparent;
  color: var(--error-color, #c62828);
  height: 34px;
  width: 34px;
}

.template-item .icon-button.danger.template-item-delete:hover {
  background: color-mix(in srgb, var(--error-color, #c62828) 10%, transparent);
  border-color: transparent;
  color: var(--error-color, #c62828);
}

.template-item.active {
  background: color-mix(in srgb, var(--primary-color) 14%, var(--card-background-color));
  border-color: color-mix(in srgb, var(--primary-color) 50%, var(--divider-color));
}

.template-detail {
  align-content: start;
  align-self: start;
  display: grid;
  gap: 12px;
}

.template-editor {
  margin-top: 0;
}

.template-editor .editor-actions {
  grid-template-columns: repeat(2, minmax(0, 180px));
  justify-content: end;
}

.template-detail-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  justify-content: flex-end;
  margin-right: 14px;
}

.template-apply-button {
  padding: 0 12px;
  width: auto;
}

.template-name-field {
  display: block;
  width: 100%;
}

.template-name-input-wrap {
  align-items: center;
  display: grid;
  gap: 8px;
  grid-template-columns: 20px minmax(0, 1fr);
  min-width: 0;
}

.template-name-input-wrap ha-icon {
  --mdc-icon-size: 18px;
  color: var(--secondary-text-color);
}

.template-apply-panel {
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  display: grid;
  gap: 12px;
  min-width: 0;
  overflow: hidden;
  padding: 10px;
}

.template-apply-scroll-wrap {
  min-width: 0;
  overflow: auto;
  padding-bottom: 8px;
  position: relative;
  scrollbar-gutter: stable;
}

.template-apply-grid {
  display: grid;
  grid-template-columns: minmax(104px, 148px) repeat(7, minmax(62px, 1fr));
  min-width: 548px;
}

.template-apply-cell {
  align-items: center;
  border-bottom: 1px solid var(--divider-color);
  border-right: 1px solid var(--divider-color);
  display: flex;
  justify-content: center;
  min-height: 42px;
  padding: 6px 8px;
}

.template-apply-cell.header {
  background: var(--secondary-background-color);
  color: var(--secondary-text-color);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.template-apply-zone {
  background: var(--card-background-color);
  justify-content: flex-start;
  left: 0;
  min-width: 0;
  overflow-wrap: anywhere;
  position: sticky;
  white-space: normal;
  z-index: 3;
}

.template-apply-zone.header {
  z-index: 5;
}

.template-apply-day {
  cursor: pointer;
}

.template-apply-day input {
  height: 18px;
  margin: 0;
  width: 18px;
}

.template-block {
  align-items: center;
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  display: grid;
  gap: 12px;
  grid-template-columns: 72px minmax(0, 1fr);
  padding: 10px;
}

.template-block span,
.template-block small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
`, Wt = u`
  .timeline-panel {
    display: grid;
    gap: 8px;
    margin: 12px 0;
  }

  .timeline-header {
    display: grid;
    gap: 6px;
  }

  .timeline-hours {
    color: var(--secondary-text-color);
    font-size: 11px;
    min-height: 22px;
    position: relative;
  }

  .timeline-hours > span {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 1;
  }

  .timeline-hours > span:nth-of-type(1) {
    left: 0;
    transform: translateY(-50%);
  }

  .timeline-hours > span:nth-of-type(2) {
    left: 25%;
  }

  .timeline-hours > span:nth-of-type(3) {
    left: 50%;
  }

  .timeline-hours > span:nth-of-type(4) {
    left: 75%;
  }

  .timeline-hours > span:nth-of-type(5) {
    left: 100%;
    transform: translate(-100%, -50%);
  }

  .timeline-track {
    background:
      linear-gradient(to right, var(--divider-color) 1px, transparent 1px) 0 0 / 25% 100%,
      var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    min-height: 76px;
    overflow: hidden;
    position: relative;
  }

  .timeline-now-marker {
    bottom: 0;
    left: 0;
    pointer-events: none;
    position: absolute;
    right: 0;
    top: 0;
    z-index: 2;
  }

  .timeline-now-marker::before {
    background: color-mix(in srgb, var(--primary-color) 82%, var(--card-background-color));
    border-radius: 999px;
    content: "";
    height: 22px;
    left: var(--timeline-now-left);
    position: absolute;
    top: 50%;
    transform: translateX(-50%);
    width: 2px;
  }

  .timeline-now-marker span {
    background: color-mix(in srgb, var(--card-background-color) 84%, var(--primary-color) 16%);
    border: 1px solid color-mix(in srgb, var(--primary-color) 58%, var(--divider-color));
    border-radius: 999px;
    color: var(--primary-text-color);
    font-size: 10px;
    font-weight: 600;
    left: clamp(26px, var(--timeline-now-left), calc(100% - 26px));
    line-height: 1;
    padding: 2px 5px;
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    white-space: nowrap;
  }

  .timeline-block {
    align-items: start;
    background: var(--timeline-bg, color-mix(in srgb, var(--primary-color) 20%, var(--card-background-color)));
    border: 1px solid var(--timeline-border, color-mix(in srgb, var(--primary-color) 48%, var(--divider-color)));
    border-radius: 8px;
    box-sizing: border-box;
    color: var(--primary-text-color);
    cursor: grab;
    display: grid;
    gap: 1px;
    height: calc(100% - 12px);
    justify-items: start;
    left: 0;
    min-width: 0;
    overflow: hidden;
    padding: 8px 12px;
    position: absolute;
    text-align: left;
    top: 6px;
    user-select: none;
  }

  .timeline-block.compact {
    gap: 0;
    padding: 8px 10px;
  }

  .timeline-block.tiny {
    padding: 8px 6px;
  }

  .timeline-block.mode-heat,
  .overview-timeline-block.mode-heat,
  .overview-timeline-boost.mode-heat {
    --timeline-bg: color-mix(in srgb, #d95f24 18%, var(--card-background-color));
    --timeline-border: color-mix(in srgb, #d95f24 48%, var(--divider-color));
    --timeline-handle: #d95f24;
  }

  .timeline-block.mode-cool,
  .overview-timeline-block.mode-cool,
  .overview-timeline-boost.mode-cool {
    --timeline-bg: color-mix(in srgb, #2d7dd2 18%, var(--card-background-color));
    --timeline-border: color-mix(in srgb, #2d7dd2 48%, var(--divider-color));
    --timeline-handle: #2d7dd2;
  }

  .timeline-block.mode-heat-cool,
  .overview-timeline-block.mode-heat-cool {
    background:
      linear-gradient(
        90deg,
        color-mix(in srgb, #d95f24 16%, var(--card-background-color)),
        color-mix(in srgb, #2d7dd2 16%, var(--card-background-color))
      );
    --timeline-border: color-mix(in srgb, #6f7f91 45%, var(--divider-color));
    --timeline-handle: #6f7f91;
  }

  .overview-timeline-boost.mode-heat-cool {
    --timeline-border: color-mix(in srgb, #6f7f91 45%, var(--divider-color));
    --timeline-handle: #6f7f91;
  }

  .timeline-block.mode-auto,
  .overview-timeline-block.mode-auto,
  .overview-timeline-boost.mode-auto {
    --timeline-bg: color-mix(in srgb, #6f7f91 18%, var(--card-background-color));
    --timeline-border: color-mix(in srgb, #6f7f91 45%, var(--divider-color));
    --timeline-handle: #6f7f91;
  }

  .timeline-block.mode-dry,
  .overview-timeline-block.mode-dry,
  .overview-timeline-boost.mode-dry {
    --timeline-bg: color-mix(in srgb, #b4872b 16%, var(--card-background-color));
    --timeline-border: color-mix(in srgb, #b4872b 42%, var(--divider-color));
    --timeline-handle: #b4872b;
  }

  .timeline-block.mode-fan,
  .overview-timeline-block.mode-fan,
  .overview-timeline-boost.mode-fan {
    --timeline-bg: color-mix(in srgb, #2f8f83 16%, var(--card-background-color));
    --timeline-border: color-mix(in srgb, #2f8f83 42%, var(--divider-color));
    --timeline-handle: #2f8f83;
  }

  .timeline-block.mode-keep,
  .overview-timeline-block.mode-keep,
  .overview-timeline-boost.mode-keep {
    --timeline-bg: color-mix(in srgb, var(--primary-color) 14%, var(--card-background-color));
    --timeline-border: color-mix(in srgb, var(--primary-color) 38%, var(--divider-color));
    --timeline-handle: var(--primary-color);
  }

  .timeline-resize-handle {
    bottom: 0;
    cursor: ew-resize;
    pointer-events: auto;
    position: absolute;
    top: 0;
    width: 10px;
    z-index: 1;
  }

  .timeline-resize-handle::after {
    background: color-mix(in srgb, var(--timeline-handle, var(--primary-color)) 72%, var(--card-background-color));
    border-radius: 999px;
    bottom: 10px;
    content: "";
    position: absolute;
    top: 10px;
    width: 3px;
  }

  .timeline-resize-handle.left {
    left: 0;
  }

  .timeline-resize-handle.left::after {
    left: 3px;
  }

  .timeline-resize-handle.right {
    right: 0;
  }

  .timeline-resize-handle.right::after {
    right: 3px;
  }

  .timeline-block:active {
    cursor: grabbing;
  }

  .timeline-block:active strong,
  .timeline-block:active span,
  .timeline-block:active small {
    cursor: grabbing;
  }

  .timeline-block:active .timeline-resize-handle {
    cursor: ew-resize;
  }

  .timeline-block.off,
  .overview-timeline-block.mode-off,
  .overview-timeline-boost.mode-off {
    --timeline-bg: color-mix(in srgb, var(--secondary-text-color) 14%, var(--card-background-color));
    --timeline-border: var(--divider-color);
    --timeline-handle: var(--secondary-text-color);
  }

  .timeline-block strong,
  .timeline-block span,
  .timeline-block small {
    cursor: inherit;
    display: block;
    max-width: 100%;
    overflow: hidden;
    pointer-events: none;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .timeline-block strong {
    font-size: 12px;
  }

  .timeline-block span,
  .timeline-block small {
    font-size: 11px;
  }

  .timeline-block.compact span,
  .timeline-block.compact small {
    display: none;
  }

  .timeline-block.tiny strong {
    font-size: 0;
  }

  .timeline-block.tiny strong::after {
    content: "...";
    font-size: 11px;
  }

  .timeline-empty {
    left: 12px;
    position: absolute;
    top: 12px;
  }
`, Gt = u`
  @media (max-width: 900px) {
    .template-library-layout {
      grid-template-columns: minmax(0, 1fr);
      max-width: 100%;
      min-width: 0;
    }

    .template-detail,
    .template-list-wrap,
    .template-apply-panel,
    .template-editor,
    .template-block-list {
      min-width: 0;
      max-width: 100%;
    }
  }

  @container (max-width: 900px) {
    .template-library-layout {
      grid-template-columns: minmax(0, 1fr);
      max-width: 100%;
      min-width: 0;
    }

    .template-detail,
    .template-list-wrap,
    .template-apply-panel,
    .template-editor,
    .template-block-list {
      min-width: 0;
      max-width: 100%;
    }
  }

  @container (max-width: 760px) {
    .settings-zone-main {
      grid-template-columns: minmax(0, 1fr);
    }

    .settings-capability-composite {
      grid-template-columns: minmax(0, 1fr);
    }

    .settings-capability-row {
      align-items: start;
      display: grid;
      gap: 8px;
      grid-template-columns: minmax(104px, 0.8fr) minmax(0, 1fr);
    }

    .settings-capability-row > .label {
      padding-top: 6px;
    }

    .settings-capability-row .settings-data-icons,
    .settings-capability-row .settings-facts,
    .settings-capability-row .settings-mode-tags {
      justify-content: flex-end;
    }

    .settings-startup {
      grid-template-columns: 32px minmax(0, 1fr) auto;
    }

    .portability-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .maintenance-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 600px) {
    ha-card {
      --ha-card-background: transparent;
      --ha-card-border-width: 0;
      --ha-card-box-shadow: none;
      background: transparent;
      border: 0;
      box-shadow: none;
    }

    .card {
      padding: 0;
    }

    .portability-export-card {
      display: none;
    }

    .maintenance-grid,
    .settings-reset {
      grid-template-columns: minmax(0, 1fr);
    }

    .settings-reset-icon {
      display: none;
    }

    .summary {
      grid-template-columns: 1fr;
    }

    .draft-list {
      grid-template-columns: auto minmax(0, 1fr) auto auto;
    }

    .overview-status-heading {
      gap: 8px;
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .overview-controls {
      justify-self: end;
    }

    .overview-pause-control {
      width: fit-content;
    }

    .overview-pause-input {
      --overview-pause-digits: 4ch;
      width: fit-content;
    }

    .event {
      min-width: 560px;
    }

    .scheduler-actions {
      right: 0;
      transform: none;
      grid-template-columns: 1fr;
      max-width: min(280px, calc(100vw - 48px));
      width: min(280px, calc(100vw - 48px));
    }

    .pause-action-group {
      grid-template-columns: 80px minmax(0, 1fr);
    }

    .pause-duration-field,
    .scheduler-actions .command-button {
      width: 100%;
    }

    .editor-header,
    .copy-header {
      align-items: stretch;
      flex-direction: column;
    }

    .schedule-zone-heading,
    .schedule-editor-heading {
      align-items: stretch;
      flex-direction: column;
    }

    .schedule-editor-badges {
      justify-content: flex-start;
    }

    .copy-targets {
      grid-template-columns: 1fr;
    }

    .template-panel {
      grid-template-columns: minmax(0, 1fr);
      justify-self: stretch;
      max-width: none;
      min-width: 0;
    }

    .schedule-config-row {
      grid-template-columns: minmax(0, 1fr);
      max-width: 100%;
      min-width: 0;
    }

    .schedule-config-row .template-panel,
    .schedule-config-row .schedule-block-actions {
      grid-column: auto;
      max-width: 100%;
      min-width: 0;
    }

    .draft-list,
    .template-list,
    .template-detail {
      max-width: 100%;
      min-width: 0;
    }

    .template-list-wrap.scrollable {
      padding: 20px 12px;
    }

    .template-list-wrap.scrollable.can-scroll-up::before,
    .template-list-wrap.scrollable.can-scroll-down::after {
      border-color: var(--secondary-text-color);
      border-style: solid;
      content: "";
      height: 9px;
      left: 50%;
      opacity: 0.8;
      pointer-events: none;
      position: absolute;
      width: 9px;
      z-index: 1;
    }

    .template-list-wrap.scrollable.can-scroll-up::before {
      border-width: 2px 0 0 2px;
      top: 54px;
      transform: translateX(-50%) rotate(45deg);
    }

    .template-list-wrap.scrollable.can-scroll-down::after {
      border-width: 0 2px 2px 0;
      bottom: 7px;
      transform: translateX(-50%) rotate(45deg);
    }

    .template-list-wrap.scrollable .template-list {
      max-height: min(326px, 58vh);
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 2px;
    }

    .template-detail-heading,
    .copy-header {
      align-items: stretch;
      flex-direction: column;
    }

    .template-apply-panel .copy-header {
      align-items: center;
      flex-direction: row;
    }

    .template-apply-panel .copy-header > div {
      min-width: 0;
    }

    .template-apply-panel .copy-header .command-button {
      flex: 0 0 auto;
      width: auto;
    }

    .editor-actions {
      grid-template-columns: 1fr;
    }

    .template-editor .editor-actions {
      grid-template-columns: 1fr;
    }

    .command-button {
      width: 100%;
    }

    .editable-block .icon-button {
      width: auto;
    }

    .settings-zone-row {
      grid-template-columns: 28px minmax(0, 1fr);
    }

    .settings-zone-row > ha-icon {
      grid-column: 1;
      grid-row: 1;
      justify-self: center;
    }

    .settings-zone-main {
      grid-column: 2;
      grid-row: 1 / span 2;
    }

    .settings-row-actions {
      align-items: center;
      flex-direction: column;
      grid-column: 1;
      grid-row: 2;
      justify-content: flex-start;
      justify-self: center;
    }
  }
`, Kt = [
	Rt,
	zt,
	Bt,
	Vt,
	Ht,
	Ut,
	Wt,
	u`
    .summary {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      margin: 0 0 16px;
    }

    .summary > div,
    .next,
    .editor {
      background: var(--secondary-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 12px;
    }

    .summary > div {
      min-width: 0;
      overflow: hidden;
      position: relative;
    }

    .summary > .summary-status {
      overflow: visible;
      z-index: 3;
    }

    .summary-status.paused {
      padding-bottom: 20px;
    }

    .summary-status-header {
      align-items: start;
      display: grid;
      gap: 8px;
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .summary-events {
      overflow: visible;
    }

    .summary strong,
    .summary span,
    label span {
      display: block;
    }

    .next,
    .schedule,
    .zones {
      margin-top: 14px;
    }

    .schedule-zone-picker {
      display: grid;
      gap: 8px;
      margin-top: 0;
    }

    .schedule-zone-picker .zones {
      margin-top: 0;
    }

    .schedule-zone-heading,
    .schedule-editor-heading,
    .schedule-step-heading {
      align-items: center;
      display: flex;
      gap: 12px;
      justify-content: space-between;
      min-width: 0;
    }

    .schedule-zone-heading > div,
    .schedule-editor-heading > div:first-child {
      min-width: 0;
    }

    .schedule-zone-heading strong,
    .schedule-editor-heading h2,
    .schedule-editor-entity {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .schedule-editor-heading {
      margin-top: 16px;
    }

    .schedule-step-heading {
      margin-top: 14px;
    }

    .schedule-step-heading strong,
    .schedule-editor-heading strong {
      font-size: 14px;
      font-weight: 600;
      min-width: 0;
    }

    .schedule-editor-entity {
      color: var(--secondary-text-color);
      display: block;
      font-size: 12px;
      margin-top: 2px;
    }

    .schedule-editor-badges {
      align-items: center;
      display: flex;
      flex: 0 0 auto;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
    }

    .zones {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 8px;
      scrollbar-gutter: stable;
    }

    .day-tabs {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(auto-fit, minmax(56px, 1fr));
      padding-bottom: 2px;
    }

    .zone,
    .day-tab {
      background: transparent;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      color: var(--primary-text-color);
      cursor: pointer;
      min-height: 40px;
      padding: 8px 12px;
    }

    .zone {
      flex: 0 0 auto;
      position: relative;
    }

    .zone.dirty::after {
      background: var(--warning-color, #f9a825);
      border: 2px solid var(--card-background-color);
      border-radius: 999px;
      content: "";
      height: 9px;
      position: absolute;
      right: -2px;
      top: -2px;
      width: 9px;
    }

    .zone.active,
    .day-tab.active {
      background: var(--primary-color);
      border-color: var(--primary-color);
      color: var(--text-primary-color);
    }

    .day-tab {
      align-items: center;
      display: grid;
      gap: 3px;
      justify-items: center;
      min-width: 0;
      padding: 8px 6px;
    }

    .day-tab span {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .day-tab strong {
      background: color-mix(in srgb, var(--secondary-text-color) 14%, transparent);
      border-radius: 999px;
      font-size: 11px;
      line-height: 1;
      min-width: 18px;
      padding: 4px 6px;
    }

    .day-tabs,
    .editor {
      margin-top: 10px;
    }

    .copy-panel {
      border-top: 1px solid var(--divider-color);
      display: grid;
      gap: 10px;
      margin-top: 12px;
      padding-top: 12px;
    }

    .copy-targets {
      grid-template-columns: repeat(auto-fit, minmax(54px, 1fr));
    }

    .copy-targets.wide {
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    }

    .copy-actions {
      display: flex;
      justify-content: flex-end;
    }

    .copy-actions .command-button {
      width: auto;
    }

    .scheduler-menu {
      justify-self: end;
      position: relative;
      z-index: 30;
    }

    .scheduler-menu summary {
      align-items: center;
      background: var(--secondary-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      color: var(--primary-text-color);
      cursor: pointer;
      display: inline-flex;
      height: 34px;
      justify-content: center;
      list-style: none;
      width: 34px;
    }

    .scheduler-menu summary::-webkit-details-marker {
      display: none;
    }

    .scheduler-menu summary:hover,
    .scheduler-menu[open] summary {
      background: color-mix(in srgb, var(--primary-color) 12%, var(--secondary-background-color));
      border-color: color-mix(in srgb, var(--primary-color) 38%, var(--divider-color));
    }

    .scheduler-menu summary ha-icon {
      --mdc-icon-size: 18px;
    }

    .scheduler-actions {
      align-items: stretch;
      background: color-mix(in srgb, var(--card-background-color) 94%, var(--primary-color) 6%);
      border: 1px solid color-mix(in srgb, var(--primary-color) 34%, var(--divider-color));
      border-radius: 8px;
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28), var(--ha-card-box-shadow, 0 2px 8px rgba(0, 0, 0, 0.16));
      display: grid;
      gap: 10px;
      grid-template-columns: minmax(0, 1fr);
      padding: 18px 12px 12px;
      position: absolute;
      right: 50%;
      top: calc(100% + 8px);
      transform: translateX(50%);
      width: 280px;
      z-index: 20;
    }

    .dialog-close {
      align-items: center;
      background: color-mix(in srgb, var(--card-background-color) 88%, var(--primary-color) 12%);
      border: 1px solid color-mix(in srgb, var(--primary-color) 26%, var(--divider-color));
      border-radius: 999px;
      color: var(--primary-text-color);
      cursor: pointer;
      display: inline-flex;
      height: 26px;
      justify-content: center;
      padding: 0;
      position: absolute;
      right: 8px;
      top: 8px;
      width: 26px;
      z-index: 1;
    }

    .dialog-close:hover {
      background: color-mix(in srgb, var(--primary-color) 18%, var(--card-background-color));
      border-color: color-mix(in srgb, var(--primary-color) 42%, var(--divider-color));
    }

    .dialog-close ha-icon {
      --mdc-icon-size: 18px;
    }

    .pause-action-group {
      align-items: end;
      background: color-mix(in srgb, var(--primary-text-color) 5%, var(--card-background-color));
      border: 1px solid color-mix(in srgb, var(--primary-text-color) 12%, var(--divider-color));
      border-radius: 8px;
      display: grid;
      gap: 10px;
      grid-template-columns: 80px minmax(0, 1fr);
      padding: 10px;
    }

    .pause-duration-field {
      width: 80px;
    }

    .scheduler-actions .command-button {
      min-width: 0;
      width: 100%;
    }

    .scheduler-actions .command-button span {
      overflow: visible;
      text-overflow: clip;
    }

    .scheduler-secondary-actions {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .pause-progress {
      bottom: 0;
      border-bottom-left-radius: 8px;
      border-bottom-right-radius: 8px;
      display: grid;
      gap: 3px;
      left: 0;
      overflow: hidden;
      position: absolute;
      right: 0;
    }

    .pause-progress span {
      color: var(--secondary-text-color);
      display: block;
      font-size: 12px;
      line-height: 1.2;
      overflow: hidden;
      padding: 0 12px 2px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .progress-track {
      background: color-mix(in srgb, var(--warning-color, #f9a825) 16%, var(--card-background-color));
      height: 4px;
      overflow: hidden;
    }

    .progress-fill {
      background: var(--warning-color, #f9a825);
      border-radius: inherit;
      height: 100%;
      transition: width 200ms ease;
    }

    .boost-status {
      align-items: center;
      background: color-mix(in srgb, var(--warning-color, #f9a825) 12%, var(--card-background-color));
      border: 1px solid color-mix(in srgb, var(--warning-color, #f9a825) 38%, var(--divider-color));
      border-radius: 8px;
      display: grid;
      gap: 10px;
      grid-template-columns: 24px minmax(0, 1fr);
      margin-top: 10px;
      padding: 10px 12px;
    }

    .boost-status ha-icon {
      color: var(--warning-color, #f9a825);
    }

    .boost-status span {
      color: var(--secondary-text-color);
      display: block;
      font-size: 12px;
      margin-top: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .check-target {
      align-items: center;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      gap: 8px;
      min-height: 38px;
      padding: 8px 10px;
    }

    .copy-targets:not(.wide) .check-target {
      justify-content: center;
      padding: 8px 6px;
    }

    .copy-targets:not(.wide) .check-target.disabled {
      color: var(--disabled-text-color, var(--secondary-text-color));
      cursor: default;
      opacity: 0.52;
    }

    .copy-targets:not(.wide) .check-target input {
      height: 16px;
      margin: 0;
      width: 16px;
    }

    .copy-targets:not(.wide) .check-target span {
      font-size: 12px;
      line-height: 1;
    }

    .check-target input {
      accent-color: var(--primary-color);
      background: transparent;
      border: 0;
      height: auto;
      margin: 0;
      padding: 0;
      width: auto;
    }

    .template-panel {
      align-items: end;
      display: grid;
      gap: 10px;
      grid-template-columns: minmax(140px, 1fr);
      margin: 0;
      width: 100%;
    }

    .template-panel > div {
      min-width: 0;
    }

    .schedule-config-helper {
      color: var(--secondary-text-color);
      font-size: 12px;
      line-height: 1.35;
      margin-top: 12px;
    }

    .schedule-config-row {
      align-items: end;
      display: grid;
      gap: 12px;
      grid-template-columns: minmax(180px, 340px) minmax(24px, 1fr) auto;
      margin: 8px 0 12px;
      min-width: 0;
    }

    .schedule-config-row .template-panel {
      grid-column: 1;
    }

    .schedule-config-row .schedule-block-actions {
      grid-column: 3;
    }

    .editor-actions {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      margin-bottom: 12px;
      margin-top: 12px;
      width: 100%;
    }

    .editor-actions .command-button {
      width: 100%;
    }

    .schedule-block-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      margin: 0;
      width: auto;
    }

    .schedule-block-actions .command-button {
      width: auto;
    }

    .template-editor .editor-actions {
      grid-template-columns: minmax(0, 180px);
    }

    .schedule-save-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 12px;
    }

    .schedule-save-actions .command-button {
      width: auto;
    }

    .schedule-copy-helper {
      color: var(--secondary-text-color);
      font-size: 12px;
      line-height: 1.35;
      margin-top: 14px;
    }

    .draft-list {
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      column-gap: 4px;
      display: grid;
      grid-template-columns: minmax(94px, 1fr) minmax(112px, 1fr) minmax(90px, 0.8fr) 40px;
      overflow: hidden;
      padding: 12px;
      row-gap: 10px;
    }

    .draft-list-header,
    .editable-block {
      display: contents;
    }

    .draft-add-row {
      align-items: center;
      display: flex;
      grid-column: 1 / -1;
      justify-content: center;
      min-width: 0;
      padding: 2px 0;
    }

    .draft-add-button {
      border-radius: 999px;
      flex: 0 0 auto;
      height: 34px;
      width: 34px;
    }

    .draft-add-button ha-icon {
      --mdc-icon-size: 18px;
    }

    .editable-block label {
      min-width: 0;
    }

    .editable-block > label > .label {
      display: none;
    }

    .editable-block .icon-button.danger {
      background: transparent;
      border-color: transparent;
      color: var(--error-color, #c62828);
      min-width: 0;
      padding: 0;
      width: auto;
    }

    .editable-block .icon-button.danger:hover {
      background: color-mix(in srgb, var(--error-color, #c62828) 10%, transparent);
      border-color: transparent;
    }

    .editable-block input,
    .editable-block select {
      margin-top: 0;
    }

    .select-wrap {
      display: block;
      margin-top: 4px;
      position: relative;
    }

    .select-wrap select {
      appearance: none;
      margin-top: 0;
      padding-right: 24px;
    }

    .select-wrap::after {
      border: solid var(--secondary-text-color);
      border-radius: 1px;
      border-width: 0 2px 2px 0;
      content: "";
      height: 7px;
      pointer-events: none;
      position: absolute;
      right: 11px;
      top: 50%;
      transform: translateY(-62%) rotate(45deg);
      transition: transform 120ms ease;
      width: 7px;
    }

    .select-wrap:has(select:open)::after {
      transform: translateY(-28%) rotate(225deg);
    }

    .editable-block .select-wrap {
      margin-top: 0;
    }

    input,
    select {
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      box-sizing: border-box;
      color: var(--primary-text-color);
      font: inherit;
      height: 38px;
      margin-top: 4px;
      padding: 6px 8px;
      width: 100%;
    }

    input:disabled,
    select:disabled {
      cursor: default;
      opacity: 0.55;
    }

    input.invalid {
      border-color: var(--error-color, #c62828);
      box-shadow: 0 0 0 1px var(--error-color, #c62828);
    }

    .field-error {
      color: var(--error-color, #c62828);
      display: block;
      font-size: 11px;
      margin-top: 4px;
    }

    .draft-list-header {
      color: var(--secondary-text-color);
      font-size: 11px;
      text-transform: uppercase;
    }

    .draft-list-header span {
      padding: 2px 8px 4px;
    }

    .mode,
    .pill {
      background: color-mix(in srgb, var(--primary-color) 12%, transparent);
      border-radius: 999px;
      color: var(--primary-text-color);
      display: inline-flex;
      justify-self: start;
      padding: 3px 8px;
      white-space: nowrap;
    }

    .pill.muted {
      background: var(--secondary-background-color);
      border: 1px solid var(--divider-color);
    }

    .pill.accent {
      background: color-mix(in srgb, var(--warning-color) 18%, transparent);
    }

    .pill.warning {
      background: color-mix(in srgb, var(--warning-color, #f9a825) 22%, transparent);
      border: 1px solid color-mix(in srgb, var(--warning-color, #f9a825) 60%, var(--divider-color));
      color: var(--primary-text-color);
    }

  `,
	Gt
], qt = class {
	constructor(e) {
		this.hass = e;
	}
	getSchedule() {
		return this.hass.connection.sendMessagePromise({ type: "velair/get_schedule" });
	}
	subscribeUpdates(e) {
		return this.hass.connection.subscribeMessage(e, { type: "velair/subscribe_updates" });
	}
	setDailySchedule(e, t, n) {
		return this.hass.connection.sendMessagePromise({
			type: "velair/set_daily_schedule",
			entity_id: e,
			weekday: t,
			blocks: n
		});
	}
	clearSchedule(e, t) {
		return this.hass.connection.sendMessagePromise({
			type: "velair/clear_schedule",
			entity_id: e,
			weekday: t
		});
	}
	copyDaySchedule(e, t, n) {
		return this.hass.connection.sendMessagePromise({
			type: "velair/copy_day_schedule",
			entity_id: e,
			source_weekday: t,
			target_weekdays: n
		});
	}
	setScheduleTemplate(e, t, n) {
		return this.hass.connection.sendMessagePromise({
			type: "velair/set_schedule_template",
			key: e,
			name: t,
			blocks: n
		});
	}
	deleteScheduleTemplate(e) {
		return this.hass.connection.sendMessagePromise({
			type: "velair/delete_schedule_template",
			key: e
		});
	}
	pauseScheduler(e) {
		let t = e === void 0 ? void 0 : { duration_minutes: e };
		return this.hass.callService(Ye, "pause", t);
	}
	resumeScheduler() {
		return this.hass.callService(Ye, "resume");
	}
	updateSettings(e) {
		return this.hass.connection.sendMessagePromise({
			type: "velair/update_settings",
			...e
		});
	}
	exportData(e) {
		return this.hass.connection.sendMessagePromise({
			type: "velair/export_data",
			sections: e
		});
	}
	importData(e, t) {
		return this.hass.connection.sendMessagePromise({
			type: "velair/import_data",
			payload: e,
			sections: t
		});
	}
	resetData() {
		return this.hass.connection.sendMessagePromise({
			type: "velair/reset_data",
			confirmation: "reset"
		});
	}
};
//#endregion
//#region src/velair/domain/templates.ts
function Jt(e) {
	return (e ?? []).map((e) => ({
		key: e.key,
		name: e.name,
		blocks: e.blocks.map((e) => ({
			action: e.action ?? "set_temperature",
			start: e.start,
			temperature: Number(e.temperature ?? 21),
			hvac_mode: e.hvac_mode ?? ""
		}))
	}));
}
function Yt(e) {
	return e.name ?? e.key;
}
function Xt(e, t) {
	let n = new Set(t.map((e) => Yt(e)));
	if (!n.has(e)) return e;
	let r = 2;
	for (; n.has(`${e} ${r}`);) r += 1;
	return `${e} ${r}`;
}
function Zt(e = Date.now(), t = Math.random()) {
	return `custom_${e.toString(36)}_${t.toString(36).slice(2, 8)}`;
}
function Qt(e, t) {
	return `${e}::${t}`;
}
function $t(e, t, n, r) {
	let i = Qt(t, n), a = new Set(e);
	return r ? a.add(i) : a.delete(i), a;
}
function en(e, t) {
	return [...e].map((e) => {
		let [t, n] = e.split("::");
		return {
			entityId: t,
			weekday: n
		};
	}).filter((e) => !!e.entityId && k.includes(e.weekday) && t.includes(e.entityId));
}
//#endregion
//#region src/velair/schedule-time.ts
var tn = /^\d{2}:\d{2}$/;
function P(e) {
	if (!tn.test(e)) return;
	let [t, n] = e.split(":").map((e) => Number(e));
	if (!(t < 0 || t > 23 || n < 0 || n > 59)) return t * 60 + n;
}
function F(e) {
	let t = Math.min(Math.max(e, 0), 1439), n = Math.floor(t / 60), r = t % 60;
	return `${String(n).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
function nn(e) {
	let t = e ? P(e) : void 0;
	if (t === void 0) return "08:00";
	let n = Math.floor(t / 60), r = t % 60, i = Math.min(n + 1, 23);
	return `${String(i).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
function rn(e, t, n) {
	return Math.min(Math.max(e, t), Math.max(t, n));
}
//#endregion
//#region src/velair/domain/schedule-events.ts
function an(e, t, n, r = /* @__PURE__ */ new Date()) {
	if (t?.enabled) {
		if (n) {
			let r = I(n.until);
			if (r) {
				let n = new Date(r);
				return sn(e, t, n) ?? on(e, t, n);
			}
		}
		return on(e, t, r);
	}
}
function on(e, t, n) {
	let r;
	for (let i = 0; i <= 7; i += 1) {
		let a = new Date(n);
		a.setDate(n.getDate() + i);
		let o = un(a);
		for (let i of t.schedule?.[o] ?? []) {
			let t = ln(a, i.start);
			if (!t || t <= n) continue;
			let s = cn(e, i, t, o);
			(!r || t < new Date(r.when)) && (r = s);
		}
	}
	return r;
}
function sn(e, t, n) {
	let r = un(n), i = n.getHours() * 60 + n.getMinutes(), a = [...t.schedule?.[r] ?? []].map((e) => ({
		block: e,
		minute: P(e.start)
	})).filter((e) => e.minute !== void 0).sort((e, t) => e.minute - t.minute).filter((e) => e.minute <= i).at(-1)?.block;
	return a ? cn(e, a, n, r) : void 0;
}
function cn(e, t, n, r) {
	return {
		entity_id: e,
		when: n.toISOString(),
		action: t.action ?? "set_temperature",
		temperature: t.temperature ?? null,
		hvac_mode: t.hvac_mode ?? null,
		weekday: r,
		start: t.start
	};
}
function ln(e, t) {
	let n = /^(\d{1,2}):(\d{2})$/.exec(t);
	if (!n) return;
	let r = Number(n[1]), i = Number(n[2]);
	if (r > 23 || i > 59) return;
	let a = new Date(e);
	return a.setHours(r, i, 0, 0), a;
}
function un(e) {
	return k[e.getDay() === 0 ? 6 : e.getDay() - 1];
}
function I(e) {
	if (typeof e != "string") return;
	let t = new Date(e).getTime();
	return Number.isNaN(t) ? void 0 : t;
}
//#endregion
//#region src/velair/domain/scheduler-state.ts
function dn(e) {
	return I(e?.paused_until);
}
function fn(e) {
	return I(e?.paused_started_at);
}
function pn(e, t, n = Date.now()) {
	if (!e || e >= t) return 100;
	let r = Math.max(1, t - e), i = Math.max(0, t - n);
	return Math.min(100, Math.max(0, i / r * 100));
}
function mn(e, t = Date.now()) {
	return e - t <= 9e4 ? 500 : 1e4;
}
function hn(e, t, n = Date.now()) {
	let r = [dn(e), ...Object.values(t ?? {}).map((e) => I(e.until))].filter((e) => typeof e == "number" && e > n);
	return r.length ? Math.min(...r) : void 0;
}
//#endregion
//#region src/velair/controllers/scheduler-controls.ts
function L(e) {
	return e;
}
function gn(e) {
	return e._data?.global.mode === "paused" || e._data?.operational_status === "paused";
}
async function _n(e, t, n = {}) {
	let r = e._api();
	if (!(!r || e._controlAction)) {
		e._controlAction = "pause", e._error = void 0, e._saveMessage = void 0;
		try {
			let i = Math.max(1, Math.round(e._pauseDurationMinutes || 1));
			await r.pauseScheduler(t ? void 0 : i), n.showSuccess !== !1 && e._showSuccess(e._t("pauseApplied")), await e._loadSchedule(), e._closeSchedulerMenu();
		} catch (t) {
			e._error = t instanceof Error ? t.message : e._t("unablePause");
		} finally {
			e._controlAction = void 0;
		}
	}
}
async function vn(e, t = {}) {
	let n = e._api();
	if (!(!n || e._controlAction)) {
		e._controlAction = "resume", e._error = void 0, e._saveMessage = void 0;
		try {
			await n.resumeScheduler(), t.showSuccess !== !1 && e._showSuccess(e._t("resumed")), await e._loadSchedule(), e._closeSchedulerMenu();
		} catch (t) {
			e._error = t instanceof Error ? t.message : e._t("unableResume");
		} finally {
			e._controlAction = void 0;
		}
	}
}
function yn(e) {
	let t = e.renderRoot.querySelector(".scheduler-menu");
	t instanceof HTMLDetailsElement && (t.open = !1), e._schedulerMenuOpen = !1;
}
function bn(e, t) {
	let n = t.currentTarget.closest(".scheduler-menu");
	e._schedulerMenuOpen = n instanceof HTMLDetailsElement ? !n.open : !e._schedulerMenuOpen;
}
function xn(e) {
	e._nextEventsOpen = !e._nextEventsOpen;
}
function Sn(e) {
	return dn(e._data?.global);
}
function Cn(e, t) {
	return pn(fn(e._data?.global), t);
}
function wn(e) {
	let t = Tn(e);
	if (!t || t <= Date.now()) {
		e._stopPauseTick();
		return;
	}
	let n = mn(t);
	(!e._pauseTick || e._pauseTickDelay !== n) && (e._stopPauseTick(), e._pauseTickDelay = n, e._pauseTick = window.setInterval(() => {
		let t = e._nextCountdownExpirationMs();
		!t || t <= Date.now() ? e._stopPauseTick() : e._pauseTickDelay !== mn(t) && e._syncPauseTick(), e.requestUpdate();
	}, n));
}
function Tn(e) {
	return hn(e._data?.global, e._data?.active_overrides);
}
function En(e) {
	e._pauseTick && (window.clearInterval(e._pauseTick), e._pauseTick = void 0, e._pauseTickDelay = void 0);
}
//#endregion
//#region src/velair/controllers/notice-actions.ts
function Dn(e) {
	return e;
}
function On(e, t) {
	t === "error" && (e._error = void 0), t === "success" && (e._saveMessage = void 0, jn(e));
}
function kn(e, t) {
	e._saveMessage = t, e._successNoticeStartedAt = Date.now(), jn(e, !1), e._successNoticeTimeout = window.setTimeout(() => {
		e._saveMessage = void 0, jn(e);
	}, Xe), e._successNoticeTick = window.setInterval(() => e.requestUpdate(), 1e3);
}
function An(e) {
	if (!e._successNoticeStartedAt) return 100;
	let t = Date.now() - e._successNoticeStartedAt;
	return Math.max(0, Math.min(100, (Xe - t) / Xe * 100));
}
function jn(e, t = !0) {
	e._successNoticeTimeout &&= (window.clearTimeout(e._successNoticeTimeout), void 0), e._successNoticeTick &&= (window.clearInterval(e._successNoticeTick), void 0), t && (e._successNoticeStartedAt = void 0);
}
//#endregion
//#region src/velair/domain/draft-blocks.ts
function Mn(e) {
	return e.map((e) => ({
		action: e.action ?? "set_temperature",
		start: e.start,
		temperature: Number(e.temperature ?? 21),
		hvac_mode: e.hvac_mode ?? ""
	}));
}
function Nn(e, t) {
	let n = e[e.length - 1];
	return [...e, {
		action: qe,
		start: t,
		temperature: Number(n?.temperature || 21),
		hvac_mode: ""
	}];
}
function Pn(e, t) {
	return e.filter((e, n) => n !== t);
}
function Fn(e, t, n, r) {
	return e[t] ? e.map((e, i) => i === t ? n === "hvac_mode" ? {
		...e,
		action: r === "off" ? Je : qe,
		hvac_mode: r === "off" ? "" : r
	} : {
		...e,
		[n]: r
	} : e) : e;
}
function In(e, t) {
	if ((e.action || "set_temperature") === "turn_off") return;
	let n = String(e.temperature ?? "").trim();
	if (!n || !/^\d+(\.\d+)?$/.test(n)) return t.rangeError;
	let r = Number(n);
	if (!Number.isFinite(r) || r < t.minTemperature || r > t.maxTemperature) return t.rangeError;
	if (Math.abs(r / t.temperatureStep - Math.round(r / t.temperatureStep)) > 1e-4) return t.stepError;
}
function Ln(e, t) {
	let n = /* @__PURE__ */ new Set(), r = [];
	for (let i of e) {
		let e = String(i.start || "").trim();
		if (!/^\d{2}:\d{2}$/.test(e)) return {
			ok: !1,
			error: t.invalidStartError(e || "empty")
		};
		let [a, o] = e.split(":").map((e) => Number(e));
		if (a < 0 || a > 23 || o < 0 || o > 59) return {
			ok: !1,
			error: t.invalidStartError(e)
		};
		if (n.has(e)) return {
			ok: !1,
			error: t.duplicateStartError(e)
		};
		if ((i.action || "set_temperature") === "turn_off") {
			r.push({
				start: e,
				action: Je
			}), n.add(e);
			continue;
		}
		let s = t.temperatureError(i);
		if (s) return {
			ok: !1,
			error: t.invalidTemperatureError(e, s)
		};
		let c = {
			action: qe,
			start: e,
			temperature: Number(i.temperature)
		};
		i.hvac_mode && (c.hvac_mode = i.hvac_mode), r.push(c), n.add(e);
	}
	return {
		ok: !0,
		blocks: r.sort((e, t) => e.start.localeCompare(t.start))
	};
}
function Rn(e, t, n) {
	return e.map((e) => (e.action || "set_temperature") === "turn_off" || e.temperature == null ? { ...e } : {
		...e,
		temperature: Math.min(n, Math.max(t, Number(e.temperature)))
	});
}
function zn(e, t) {
	let n = new Set(t);
	return e.find((e) => (e.action || "set_temperature") !== "turn_off" && !!e.hvac_mode && !n.has(e.hvac_mode ?? ""));
}
//#endregion
//#region src/velair/domain/overrides.ts
function Bn(e, t = Date.now()) {
	if (!e || e.type !== "boost") return !1;
	let n = Number(e.temperature), r = I(e.until);
	return Number.isFinite(n) && !!(r && r > t);
}
function Vn(e, t = Date.now()) {
	if (!e || e.type !== "pause") return !1;
	let n = I(e.until);
	return Object.prototype.hasOwnProperty.call(e, "until") && n === void 0 ? !1 : n === void 0 || n > t;
}
//#endregion
//#region src/velair/domain/timeline.ts
function Hn(e) {
	return e.getHours() * 60 + e.getMinutes();
}
function Un(e) {
	let t = Hn(e);
	return {
		label: F(t),
		left: t / 1440 * 100,
		minute: t
	};
}
function Wn(e) {
	let t = e.map((e, t) => ({
		draft: e,
		index: t,
		startMinute: P(e.start)
	})).filter((e) => e.startMinute !== void 0).sort((e, t) => e.startMinute - t.startMinute);
	return t.map((e, n) => {
		let r = e.startMinute, i = t[n + 1], a = i?.startMinute, o = typeof a == "number" && a > r ? a : 1440, s = r / 1440 * 100, c = Math.max((o - r) / 1440 * 100, 3.5);
		return {
			draft: e.draft,
			endMinute: o,
			index: e.index,
			left: s,
			nextIndex: i?.index,
			startMinute: r,
			width: Math.min(c, 100 - s)
		};
	});
}
function Gn(e) {
	let t = e.map((e, t) => ({
		block: e,
		index: t,
		startMinute: P(e.start)
	})).filter((e) => e.startMinute !== void 0).sort((e, t) => e.startMinute - t.startMinute);
	return t.map((e, n) => {
		let r = t[n + 1]?.startMinute, i = typeof r == "number" && r > e.startMinute ? r : 1440, a = e.startMinute / 1440 * 100, o = (i - e.startMinute) / 1440 * 100;
		return {
			block: e.block,
			endMinute: i,
			index: e.index,
			left: a,
			startMinute: e.startMinute,
			width: Math.max(Math.min(o, 100 - a), .5)
		};
	});
}
function Kn(e, t = /* @__PURE__ */ new Date()) {
	if (!Bn(e, t.getTime())) return;
	let n = Yn(e.until);
	if (!n) return;
	let r = Yn(e.started_at) ?? t.getTime(), i = new Date(t);
	i.setHours(0, 0, 0, 0);
	let a = new Date(i);
	a.setDate(i.getDate() + 1);
	let o = Math.max(r, i.getTime()), s = Math.min(n, a.getTime());
	if (s <= o || o >= a.getTime() || s <= i.getTime()) return;
	let c = Math.max(0, Math.min(1440, Math.round((o - i.getTime()) / 6e4))), l = Math.max(c + 1, Math.min(1440, Math.round((s - i.getTime()) / 6e4))), u = c / 1440 * 100, d = (l - c) / 1440 * 100, ee = Number(e.temperature), te = typeof e.hvac_mode == "string" ? e.hvac_mode : void 0;
	return {
		block: {
			action: qe,
			start: F(c),
			...Number.isFinite(ee) ? { temperature: ee } : {},
			...te ? { hvac_mode: te } : {}
		},
		endMinute: l,
		left: u,
		startMinute: c,
		width: Math.max(Math.min(d, 100 - u), .5)
	};
}
function qn(e, t = /* @__PURE__ */ new Date()) {
	if (!Vn(e, t.getTime())) return;
	let n = Yn(e.until), r = new Date(t);
	r.setHours(0, 0, 0, 0);
	let i = new Date(r);
	if (i.setDate(r.getDate() + 1), !n) return {
		endMinute: 1440,
		indefinite: !0,
		left: 0,
		startMinute: 0,
		width: 100
	};
	let a = Yn(e.started_at) ?? t.getTime(), o = Math.max(a, r.getTime()), s = Math.min(n, i.getTime());
	if (s <= o || o >= i.getTime() || s <= r.getTime()) return;
	let c = Math.max(0, Math.min(1440, Math.round((o - r.getTime()) / 6e4))), l = Math.max(c + 1, Math.min(1440, Math.round((s - r.getTime()) / 6e4))), u = c / 1440 * 100, d = (l - c) / 1440 * 100;
	return {
		endMinute: l,
		indefinite: !1,
		left: u,
		startMinute: c,
		width: Math.max(Math.min(d, 100 - u), .5)
	};
}
function Jn(e) {
	return e.map((e, t) => ({
		block: e,
		index: t,
		startMinute: P(e.start)
	})).sort((e, t) => e.startMinute === void 0 && t.startMinute === void 0 ? e.index - t.index : e.startMinute === void 0 ? 1 : t.startMinute === void 0 ? -1 : e.startMinute - t.startMinute || e.index - t.index).map((e) => e.block);
}
function Yn(e) {
	if (typeof e != "string") return;
	let t = new Date(e).getTime();
	return Number.isNaN(t) ? void 0 : t;
}
function Xn(e, t, n) {
	let r = n > 0 ? (e - t) / n : 0, i = Math.round(Math.min(Math.max(r, 0), 1) * 1440 / 15) * 15;
	return Math.min(i, 1425);
}
function Zn(e) {
	if (e.action === "turn_off") return "off";
	switch (e.hvac_mode) {
		case "heat": return "heat";
		case "cool": return "cool";
		case "heat_cool": return "heat-cool";
		case "dry": return "dry";
		case "fan_only": return "fan";
		case "auto": return "auto";
		case "off": return "off";
		default: return "keep";
	}
}
//#endregion
//#region src/velair/controllers/draft-actions.ts
function R(e) {
	return e;
}
function Qn(e, t = "schedule") {
	let n = e._blocksForSource(t);
	e._setBlocksForSource(t, Nn(n, nn(n.at(-1)?.start))), e._markBlocksDirty(t), e._saveMessage = void 0;
}
function $n(e, t, n = "schedule") {
	e._setBlocksForSource(n, Pn(e._blocksForSource(n), t)), e._markBlocksDirty(n), e._saveMessage = void 0;
}
function er(e, t, n, r, i = "schedule") {
	let a = e._blocksForSource(i);
	a[t] && (e._setBlocksForSource(i, Fn(a, t, n, r)), e._markBlocksDirty(i), e._saveMessage = void 0);
}
function tr(e) {
	e._dirty = !0, e._dirtyEntityId = e._selectedEntity;
}
function nr(e, t, n, r = {}, i = "schedule") {
	let a = e._blocksForSource(i);
	a[t] && (e._setBlocksForSource(i, a.map((e, r) => r === t ? {
		...e,
		start: n
	} : e)), r.sort && e._setBlocksForSource(i, Jn(e._blocksForSource(i))), e._markBlocksDirty(i), e._saveMessage = void 0);
}
function rr(e, t, n) {
	!k.includes(t) || t === e._selectedWeekday || (e._copyTargets = Dt(e._copyTargets, t, n), e._saveMessage = void 0);
}
function ir(e, t, n) {
	!(e._data?.configured_entities ?? []).includes(t) || t === e._selectedEntity || (e._zoneTargets = Dt(e._zoneTargets, t, n), e._saveMessage = void 0);
}
//#endregion
//#region src/velair/controllers/draft-validation.ts
function ar(e) {
	return e;
}
function or(e, t = "schedule") {
	return e._blocksForSource(t).some((n) => !!sr(e, n, t));
}
function sr(e, t, n = "schedule") {
	let [r, i] = e._temperatureLimits(n);
	return In(t, {
		maxTemperature: i,
		minTemperature: r,
		rangeError: e._t("invalidTemperatureRange", {
			min: e._formatTemperatureLimit(r),
			max: e._formatTemperatureLimit(i)
		}),
		stepError: e._t("invalidTemperatureStep"),
		temperatureStep: e._temperatureStep(n)
	});
}
//#endregion
//#region src/velair/domain/portable.ts
function cr(e) {
	if (!e || e.format !== "velair_portable_data" || !Number.isInteger(e.model_version) || Number(e.model_version) < 1 || Number(e.model_version) > 1 || !e.sections || typeof e.sections != "object") return {
		ok: !1,
		errorKey: "invalidImportFile"
	};
	let t = lr(e);
	return t.length ? {
		ok: !0,
		sections: t
	} : {
		ok: !1,
		errorKey: "noImportSections"
	};
}
function lr(e) {
	let t = e?.sections;
	return !t || typeof t != "object" ? [] : $e.filter((e) => Object.prototype.hasOwnProperty.call(t, e));
}
function ur(e, t) {
	let n = [];
	return e.has("zones") && n.push({
		section: "zones",
		value: t.zones
	}), e.has("templates") && n.push({
		section: "templates",
		value: t.templates
	}), e.has("settings") && n.push({
		section: "settings",
		value: "included"
	}), n;
}
function dr(e) {
	let t = e?.sections;
	if (!t) return [];
	let n = [];
	if (Object.prototype.hasOwnProperty.call(t, "zones")) {
		let e = t.zones;
		n.push({
			section: "zones",
			value: e && typeof e == "object" && !Array.isArray(e) ? Object.keys(e).length : 0
		});
	}
	if (Object.prototype.hasOwnProperty.call(t, "templates")) {
		let e = t.templates;
		n.push({
			section: "templates",
			value: Array.isArray(e) ? e.length : 0
		});
	}
	return Object.prototype.hasOwnProperty.call(t, "settings") && n.push({
		section: "settings",
		value: "included"
	}), n;
}
//#endregion
//#region src/velair/controllers/portability-actions.ts
function z(e) {
	return e;
}
function fr(e, t, n, r) {
	let i = new Set(t === "export" ? e._exportSections : e._importSections);
	r ? i.add(n) : i.delete(n), t === "export" ? e._exportSections = i : e._importSections = i;
}
async function pr(e, t) {
	let n = t.currentTarget, r = n.files?.[0];
	if (e._importPayload = void 0, e._importFileName = "", e._importSections = /* @__PURE__ */ new Set(), e._error = void 0, e._saveMessage = void 0, r) try {
		let t = JSON.parse(await r.text()), n = cr(t);
		if (!n.ok) throw Error(e._t(n.errorKey));
		e._importPayload = t, e._importFileName = r.name, e._importSections = new Set(n.sections);
	} catch (t) {
		e._error = t instanceof Error ? t.message : e._t("invalidImportFile"), n.value = "";
	}
}
async function mr(e) {
	let t = e._api();
	if (!(!t || !e._exportSections.size)) {
		e._portabilityAction = "export", e._error = void 0, e._saveMessage = void 0;
		try {
			let n = await t.exportData([...e._exportSections]);
			e._downloadPortablePayload(n), e._saveMessage = e._t("portableExported");
		} catch (t) {
			e._error = t instanceof Error ? t.message : e._t("unableExport");
		} finally {
			e._portabilityAction = void 0;
		}
	}
}
async function hr(e) {
	let t = e._api();
	if (!(!t || !e._importPayload || !e._importSections.size)) {
		e._portabilityAction = "import", e._error = void 0, e._saveMessage = void 0;
		try {
			let n = await t.importData(e._importPayload, [...e._importSections]);
			e._applyScheduleData(n, { forceDraft: !0 }), e._saveMessage = e._t("portableImported");
		} catch (t) {
			e._error = t instanceof Error ? t.message : e._t("invalidImportFile");
		} finally {
			e._portabilityAction = void 0;
		}
	}
}
async function gr(e) {
	let t = e._api();
	if (!(!t || e._maintenanceAction) && window.confirm(e._t("confirmReset"))) {
		e._maintenanceAction = "reset", e._error = void 0, e._saveMessage = void 0;
		try {
			let n = await t.resetData();
			e._selectedTemplateKey = "", e._templateApplyOpen = !1, e._templateApplyTargets = /* @__PURE__ */ new Set(), e._applyScheduleData(n, { forceDraft: !0 }), e._showSuccess(e._t("resetDone"));
		} catch (t) {
			e._error = t instanceof Error ? t.message : e._t("unableSaveSettings");
		} finally {
			e._maintenanceAction = void 0;
		}
	}
}
function _r(e) {
	return lr(e._importPayload);
}
function vr(e) {
	return ur(new Set($e), {
		zones: e._data?.configured_entities.length ?? 0,
		templates: e._scheduleTemplates().length
	}).map((t) => e._portableSummaryItem(t));
}
function yr(e) {
	return dr(e._importPayload).map((t) => e._portableSummaryItem(t));
}
function br(e, t) {
	let n = e._portableSectionLabel(t.section);
	return {
		label: n,
		section: t.section,
		title: n,
		value: t.value === "included" ? e._t("portabilityIncluded") : t.value
	};
}
function xr(e, t) {
	switch (t) {
		case "templates": return e._t("portabilityTemplatesSection");
		case "settings": return e._t("portabilitySettingsSection");
		default: return e._t("portabilityZonesSection");
	}
}
function Sr(e) {
	let t = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), n = new Blob([JSON.stringify(e, null, 2)], { type: "application/json" }), r = URL.createObjectURL(n), i = document.createElement("a");
	i.href = r, i.download = `velair-export-${t}.json`, i.style.display = "none", document.body.append(i), i.click(), i.remove(), URL.revokeObjectURL(r);
}
//#endregion
//#region src/velair/controllers/settings-actions.ts
function B(e) {
	return e;
}
async function Cr(e, t) {
	let n = k.includes(t) ? t : "monday";
	e._selectedWeekday = n, e._copyTargets = /* @__PURE__ */ new Set(), e._zoneTargets = /* @__PURE__ */ new Set(), await e._saveSettings({ first_weekday: n }), e._resetDraftBlocks();
}
async function wr(e, t) {
	let n = e._api(), r = {
		...e._config,
		first_weekday: t.first_weekday ?? e._config.first_weekday,
		zone_order: t.zone_order ?? e._config.zone_order
	};
	if (delete r.selected_entity, e._config = r, !(!n || e._hasExternalConfig)) {
		e._settingsSaving = !0, e._error = void 0, e._saveMessage = void 0;
		try {
			let r = await n.updateSettings(t);
			e._applyScheduleData(r);
		} catch (t) {
			e._error = t instanceof Error ? t.message : e._t("unableReset");
		} finally {
			e._settingsSaving = !1;
		}
	}
}
function Tr(e, t, n) {
	let r = e._orderedZoneIds(e._data?.configured_entities ?? []), i = r.indexOf(t), a = i + n;
	if (i < 0 || a < 0 || a >= r.length) return;
	let o = [...r];
	[o[i], o[a]] = [o[a], o[i]], e._updateSettingsZoneOrder(o);
}
function Er(e, t, n) {
	e._draggedSettingsEntity = t, n.dataTransfer?.setData("text/plain", t), n.dataTransfer && (n.dataTransfer.effectAllowed = "move");
}
function Dr(e) {
	e.preventDefault(), e.dataTransfer && (e.dataTransfer.dropEffect = "move");
}
function Or(e, t, n) {
	n.preventDefault();
	let r = n.dataTransfer?.getData("text/plain") || e._draggedSettingsEntity;
	if (e._draggedSettingsEntity = void 0, !r || r === t) return;
	let i = e._orderedZoneIds(e._data?.configured_entities ?? []).filter((e) => e !== r), a = i.indexOf(t);
	a < 0 || (i.splice(a, 0, r), e._updateSettingsZoneOrder(i));
}
function kr(e) {
	e._draggedSettingsEntity = void 0;
}
function Ar(e, t) {
	let n = new Set(e._data?.configured_entities ?? []), r = t.filter((e) => n.has(e));
	e._saveSettings({ zone_order: r });
}
//#endregion
//#region src/velair/controllers/timeline-interactions.ts
function V(e) {
	return e;
}
function jr(e, t, n, r) {
	e._draggedTimelineIndex = t, r.dataTransfer?.setData("text/plain", JSON.stringify({
		index: t,
		source: n
	})), r.dataTransfer && (r.dataTransfer.effectAllowed = "move");
}
function Mr(e) {
	e.preventDefault(), e.dataTransfer && (e.dataTransfer.dropEffect = "move");
}
function Nr(e, t, n = "schedule") {
	t.preventDefault();
	let { index: r, source: i } = Pr(e, t, n);
	if (e._draggedTimelineIndex = void 0, !Number.isInteger(r) || !e._blocksForSource(i)[r]) return;
	let a = t.currentTarget, o = Hr(e, t.clientX, a);
	e._setDraftBlockStart(r, o, { sort: !0 }, i);
}
function Pr(e, t, n) {
	let r = t.dataTransfer?.getData("text/plain");
	if (r) try {
		let e = JSON.parse(r);
		if (typeof e.index == "number" && (e.source === "schedule" || e.source === "template")) return {
			index: e.index,
			source: e.source
		};
	} catch {
		let e = Number(r);
		if (Number.isInteger(e)) return {
			index: e,
			source: n
		};
	}
	return {
		index: Number(e._draggedTimelineIndex),
		source: n
	};
}
function Fr(e) {
	e._draggedTimelineIndex = void 0;
}
function Ir(e, t, n, r, i) {
	i.preventDefault(), i.stopPropagation();
	let a = i.currentTarget.closest(".timeline-track");
	a instanceof HTMLElement && (e._timelineResize = {
		edge: n,
		index: t,
		source: r,
		track: a
	}, e.classList.add("timeline-resizing"), Wr(e, "ew-resize"), window.addEventListener("pointermove", e._handleTimelineResizeMove), window.addEventListener("pointerup", e._handleTimelineResizeEnd, { once: !0 }), e._resizeTimelineBlock(t, n, Ur(i.clientX, a), r));
}
function Lr(e, t) {
	if (!e._timelineResize) return;
	t.preventDefault();
	let { edge: n, index: r, source: i, track: a } = e._timelineResize;
	e._resizeTimelineBlock(r, n, Ur(t.clientX, a), i);
}
function Rr(e) {
	window.removeEventListener("pointermove", e._handleTimelineResizeMove);
	let t = e._timelineResize?.source ?? "schedule";
	e.classList.remove("timeline-resizing"), e._timelineResize = void 0, Gr(e), e._sortDraftBlocksByStart(t);
}
function zr(e, t, n, r, i = "schedule") {
	let a = Vr(e, i), o = a.findIndex((e) => e.index === t), s = a[o];
	if (!s) return;
	if (n === "start") {
		let n = a[o - 1]?.startMinute, c = typeof n == "number" ? n + 15 : 0, l = s.endMinute - 15;
		e._setDraftBlockStart(t, F(rn(r, c, l)), {}, i);
		return;
	}
	let c = a[o + 1];
	if (!c) return;
	let l = a[o + 2]?.startMinute, u = s.startMinute + 15, d = typeof l == "number" ? l - 15 : 1425;
	e._setDraftBlockStart(c.index, F(rn(r, u, d)), {}, i);
}
function Br(e, t = "schedule") {
	e._setBlocksForSource(t, Jn(e._blocksForSource(t)));
}
function Vr(e, t = "schedule") {
	return Wn(e._blocksForSource(t));
}
function Hr(e, t, n) {
	return F(Ur(t, n));
}
function Ur(e, t) {
	let n = t.getBoundingClientRect();
	return Xn(e, n.left, n.width);
}
function Wr(e, t) {
	document.body && (e._previousBodyCursor === void 0 && (e._previousBodyCursor = document.body.style.cursor), e._previousDocumentCursor === void 0 && (e._previousDocumentCursor = document.documentElement.style.cursor), document.body.style.cursor = t, document.documentElement.style.cursor = t);
}
function Gr(e) {
	!document.body || e._previousBodyCursor === void 0 || (document.body.style.cursor = e._previousBodyCursor, document.documentElement.style.cursor = e._previousDocumentCursor ?? "", e._previousBodyCursor = void 0, e._previousDocumentCursor = void 0);
}
//#endregion
//#region src/velair/controllers/schedule-actions.ts
function H(e) {
	return e;
}
async function Kr(e) {
	let t = e._api();
	if (!t || !e._selectedEntity || e._saving) return;
	let n = e._normalizeDraftBlocks();
	if (!n.ok) {
		e._error = n.error;
		return;
	}
	let r = e._unsupportedModeError(n.blocks, e._selectedEntity);
	if (r) {
		e._error = r;
		return;
	}
	e._saving = !0, e._error = void 0, e._saveMessage = void 0;
	try {
		let r = await t.setDailySchedule(e._selectedEntity, e._selectedWeekday, n.blocks);
		e._dirty = !1, e._dirtyEntityId = void 0, e._applyScheduleData(r, { forceDraft: !0 }), e._showSuccess(e._t("saved"));
	} catch (t) {
		e._error = t instanceof Error ? t.message : e._t("unableSave");
	} finally {
		e._saving = !1;
	}
}
async function qr(e) {
	let t = e._api();
	if (!t || !e._selectedEntity || e._copying || e._copyTargets.size === 0) return;
	let n = e._normalizeDraftBlocks();
	if (!n.ok) {
		e._error = n.error;
		return;
	}
	let r = e._unsupportedModeError(n.blocks, e._selectedEntity);
	if (r) {
		e._error = r;
		return;
	}
	let i = [...e._copyTargets];
	e._copying = !0, e._error = void 0, e._saveMessage = void 0;
	try {
		e._dirty && await t.setDailySchedule(e._selectedEntity, e._selectedWeekday, n.blocks);
		let r = await t.copyDaySchedule(e._selectedEntity, e._selectedWeekday, i);
		e._dirty = !1, e._dirtyEntityId = void 0, e._copyTargets = /* @__PURE__ */ new Set(), e._applyScheduleData(r, { forceDraft: !0 }), e._showSuccess(e._t("appliedDays", {
			count: i.length,
			suffix: i.length === 1 ? "" : "s"
		}));
	} catch (t) {
		e._error = t instanceof Error ? t.message : e._t("unableCopy");
	} finally {
		e._copying = !1;
	}
}
async function Jr(e) {
	let t = e._api();
	if (!t || !e._selectedEntity || e._applyingZones || e._zoneTargets.size === 0) return;
	let n = e._normalizeDraftBlocks();
	if (!n.ok) {
		e._error = n.error;
		return;
	}
	let r = [...e._zoneTargets];
	for (let t of r) {
		let r = e._unsupportedModeError(n.blocks, t);
		if (r) {
			e._error = r;
			return;
		}
	}
	e._applyingZones = !0, e._error = void 0, e._saveMessage = void 0;
	try {
		let i;
		e._dirty && (i = await t.setDailySchedule(e._selectedEntity, e._selectedWeekday, n.blocks));
		for (let a of r) i = await t.setDailySchedule(a, e._selectedWeekday, e._clampBlocksForEntity(n.blocks, a));
		e._dirty = !1, e._dirtyEntityId = void 0, e._zoneTargets = /* @__PURE__ */ new Set(), i && e._applyScheduleData(i, { forceDraft: !0 }), e._showSuccess(e._t("appliedThermostats", {
			count: r.length,
			suffix: r.length === 1 ? "" : "s"
		}));
	} catch (t) {
		e._error = t instanceof Error ? t.message : e._t("unableApplyThermostats");
	} finally {
		e._applyingZones = !1;
	}
}
function Yr(e, t = "schedule") {
	return Ln(e._blocksForSource(t), {
		duplicateStartError: (t) => e._t("duplicateStart", { start: t }),
		invalidStartError: (t) => e._t("invalidStart", { start: t }),
		invalidTemperatureError: (t, n) => `${e._t("invalidTemperature", { start: t })}: ${n}`,
		temperatureError: (n) => e._temperatureError(n, t)
	});
}
function Xr(e, t, n) {
	let [r, i] = e._entityTemperatureLimits(n);
	return Rn(t, r, i);
}
function Zr(e, t, n) {
	let r = zn(t, e._climateSupportedModes(n));
	if (r?.hvac_mode) return e._t("unsupportedModeForClimate", {
		entity: e._friendlyEntityName(n),
		mode: e._modeLabel(r.hvac_mode),
		start: r.start
	});
}
//#endregion
//#region src/velair/controllers/schedule-state.ts
function U(e) {
	return e;
}
async function Qr(e) {
	let t = e._api();
	if (!(!t || e._loading)) {
		e._loading = !0, e._error = void 0;
		try {
			let n = await t.getSchedule();
			e._applyScheduleData(n);
		} catch (t) {
			e._error = t instanceof Error ? t.message : e._t("unableLoad");
		} finally {
			e._loading = !1;
		}
	}
}
async function $r(e) {
	let t = e._api();
	if (!(!t || e._unsubscribeUpdates || e._subscribing)) {
		e._subscribing = !0;
		try {
			e._unsubscribeUpdates = await t.subscribeUpdates((t) => {
				if (!t.loaded || !t.schedule) {
					e._loadSchedule();
					return;
				}
				e._applyScheduleData(t.schedule);
			});
		} catch (t) {
			e._error = t instanceof Error ? t.message : e._t("unableSubscribe");
		} finally {
			e._subscribing = !1;
		}
	}
}
function ei(e, t, n = {}) {
	let r = !e._data;
	e._data = t, e._hasExternalConfig || (e._config = {
		first_weekday: t.settings.first_weekday,
		zone_order: t.settings.zone_order
	}), r && (e._selectedWeekday = t.settings.first_weekday);
	let i = e._orderedZoneIds(t.configured_entities);
	(!e._selectedEntity || !t.configured_entities.includes(e._selectedEntity)) && (e._selectedEntity = i[0]), e._selectedTemplateKey && !e._scheduleTemplates().some((t) => t.key === e._selectedTemplateKey) && (e._selectedTemplateKey = "");
	let a = e._scheduleTemplates().find((t) => t.key === e._selectedTemplateKey);
	a ? (!e._templateDirty || e._templateDraftKey !== a.key) && e._resetTemplateDraft(a) : e._resetTemplateDraft(), e._syncPauseTick(), (n.forceDraft || !e._dirty) && e._resetDraftBlocks();
}
function ti(e) {
	e._draftBlocks = Mn((e._selectedEntity ? e._data?.zones[e._selectedEntity] : void 0)?.schedule?.[e._selectedWeekday] ?? []), e._dirty = !1, e._dirtyEntityId = void 0;
}
function ni(e, t) {
	e._selectedEntity = t, e._saveMessage = void 0, e._copyTargets = /* @__PURE__ */ new Set(), e._zoneTargets = /* @__PURE__ */ new Set(), e._resetDraftBlocks();
}
function ri(e, t) {
	k.includes(t) && (e._selectedWeekday = t, e._saveMessage = void 0, e._copyTargets = /* @__PURE__ */ new Set(), e._zoneTargets = /* @__PURE__ */ new Set(), e._resetDraftBlocks());
}
function ii(e, t) {
	return t === "template" ? e._templateDraftBlocks : e._draftBlocks;
}
function ai(e, t, n) {
	if (t === "template") {
		e._templateDraftBlocks = n;
		return;
	}
	e._draftBlocks = n;
}
function oi(e, t) {
	if (t === "template") {
		e._templateDirty = !0;
		return;
	}
	e._markDirty();
}
//#endregion
//#region src/velair/domain/entity-diagnostics.ts
function si(e, t, n) {
	let r = [], i = "ok";
	if (!t) return {
		messageKeys: ["entityDiagnosticMissing"],
		status: "error"
	};
	e.startsWith("climate.") || (r.push("entityDiagnosticNotClimate"), i = "error"), n.length || (r.push("entityDiagnosticNoModes"), i = i === "error" ? "error" : "warning");
	let a = t.attributes ?? {};
	return (typeof a.min_temp != "number" || typeof a.max_temp != "number") && (r.push("entityDiagnosticNoRange"), i = i === "error" ? "error" : "warning"), {
		messageKeys: r,
		status: i
	};
}
//#endregion
//#region src/velair/domain/formatters.ts
function ci(e) {
	return e === "es" ? "es-ES" : "en";
}
function li(e, t) {
	let n = new Date(e);
	return Number.isNaN(n.getTime()) ? e : n.toLocaleString(t, {
		weekday: "short",
		hour: "2-digit",
		minute: "2-digit"
	});
}
function ui(e) {
	let t = Math.max(0, Math.ceil(e / 1e3));
	if (t < 60) return `${t} s`;
	let n = Math.floor(t / 60);
	if (n < 60) return `${n} min`;
	let r = Math.floor(n / 60), i = n % 60;
	return i ? `${r} h ${i} min` : `${r} h`;
}
function di(e, t) {
	return `${e.toFixed(e % 1 == 0 ? 0 : 1)} ${t}`;
}
function fi(e, t) {
	return e ?? t ?? "°C";
}
function pi(e, t, n) {
	return e.action === "turn_off" ? t.off : e.temperature == null ? t.setTemperature : n(Number(e.temperature), e.entity_id);
}
function mi(e, t, n) {
	return e.hvac_mode ? n(e.hvac_mode) : e.action === "turn_off" ? n("off") : t.keepMode;
}
//#endregion
//#region src/velair/controllers/climate-display.ts
function W(e) {
	return e;
}
function hi(e, t = "schedule", n = e._selectedEntity) {
	return t === "template" ? e._templateTemperatureLimits() : e._entityTemperatureLimits(n);
}
function gi(e, t) {
	return ht(t ? e.hass?.states?.[t] : void 0);
}
function _i(e) {
	return wt((e._data?.configured_entities ?? []).map((t) => e._entityTemperatureLimits(t)));
}
function vi(e, t = "schedule", n = e._selectedEntity) {
	return t === "template" ? Tt((e._data?.configured_entities ?? []).map((t) => e._entityTemperatureStep(t))) : e._entityTemperatureStep(n);
}
function yi(e, t) {
	return gt(t ? e.hass?.states?.[t] : void 0);
}
function bi(e, t) {
	return !!e.hass?.states?.[t];
}
function xi(e, t) {
	return e.hass?.states?.[t]?.attributes?.friendly_name ?? t;
}
function Si(e, t) {
	return _t(e.hass?.states?.[t]);
}
function Ci(e, t = "schedule") {
	return t === "template" ? e._uniqueModes((e._data?.configured_entities ?? []).flatMap((t) => e._climateSupportedModes(t))) : e._uniqueModes(e._selectedEntity ? e._climateSupportedModes(e._selectedEntity) : []);
}
function wi(e) {
	return vt(e);
}
function Ti(e, t) {
	let n = si(t, e.hass?.states?.[t], e._climateSupportedModes(t)), r = n.messageKeys.map((t) => e._t(t));
	return {
		messages: r,
		status: n.status,
		tooltip: r.length ? r.join(" · ") : e._t("entityDiagnosticOk")
	};
}
function Ei(e, t) {
	return yt(e.hass?.states?.[t]).map((t) => ({
		icon: t.icon,
		label: e._t(t.labelKey)
	}));
}
function Di(e, t) {
	return li(t, e._dateLocale());
}
function Oi(e) {
	return ci(e._language());
}
function ki(e, t, n) {
	return di(t, e._temperatureUnit(n));
}
function Ai(e, t) {
	return pi(t, {
		off: e._t("off"),
		setTemperature: e._t("setTemperature")
	}, (t, n) => e._formatTemperature(t, n));
}
function ji(e, t) {
	return mi(t, { keepMode: e._t("keepMode") }, (t) => e._modeLabel(t));
}
function Mi(e, t) {
	return fi(t ? e.hass?.states?.[t]?.attributes?.unit_of_measurement : void 0, e.hass?.config?.unit_system?.temperature);
}
//#endregion
//#region src/velair/controllers/template-actions.ts
function G(e) {
	return e;
}
function Ni(e, t) {
	e._selectedTemplateKey = t;
	let n = e._scheduleTemplates().find((e) => e.key === t);
	if (e._templateDraftKey !== t && (e._resetTemplateDraft(n), e._templateApplyOpen = !1, e._templateApplyTargets = /* @__PURE__ */ new Set()), e._templateNameDraftKey === t) {
		e._saveMessage = void 0;
		return;
	}
	e._templateNameDraftKey = t, e._templateNameDraft = n ? e._templateLabel(n) : "", e._saveMessage = void 0;
}
function Pi(e, t) {
	let n = e._selectedTemplateKey;
	e._selectedTemplateKey = t, e._saveMessage = void 0, t && (e._applySelectedTemplate() || (e._selectedTemplateKey = n));
}
function Fi(e, t) {
	e._templateDraftKey = t?.key ?? "", e._templateDraftBlocks = t ? Yi(t.blocks) : [], e._templateDirty = !1;
}
function Ii(e, t) {
	let n = ["template-list-wrap"];
	return t > 5 && n.push("scrollable"), e._templateListCanScrollUp && n.push("can-scroll-up"), e._templateListCanScrollDown && n.push("can-scroll-down"), n.join(" ");
}
function Li(e) {
	let t = e.renderRoot.querySelector(".template-list");
	if (!(t instanceof HTMLElement)) {
		e._setTemplateListScrollIndicators(!1, !1);
		return;
	}
	let n = t.scrollHeight > t.clientHeight + 1, r = n && t.scrollTop > 1, i = n && t.scrollTop + t.clientHeight < t.scrollHeight - 1;
	e._setTemplateListScrollIndicators(r, i);
}
function Ri(e, t, n) {
	e._templateListCanScrollUp !== t && (e._templateListCanScrollUp = t), e._templateListCanScrollDown !== n && (e._templateListCanScrollDown = n);
}
function zi(e, t) {
	return e._templateNameDraftKey === t.key ? e._templateNameDraft : e._templateLabel(t);
}
function Bi(e, t, n) {
	e._templateNameDraftKey = t, e._templateNameDraft = n, e._templateDirty = !0, e._saveMessage = void 0;
}
async function Vi(e) {
	let t = e._api();
	if (!t || e._templateAction) return;
	let n = e._newTemplateKey(), r = e._uniqueTemplateName(e._t("newTemplate"));
	e._templateAction = "save", e._error = void 0, e._saveMessage = void 0;
	try {
		let i = await t.setScheduleTemplate(n, r, []);
		e._applyScheduleData(i), e._selectedTemplateKey = n, e._templateNameDraftKey = n, e._templateNameDraft = r, e._resetTemplateDraft(e._scheduleTemplates().find((e) => e.key === n)), e._showSuccess(e._t("templateSaved"));
	} catch (t) {
		e._error = t instanceof Error ? t.message : e._t("unableSaveTemplate");
	} finally {
		e._templateAction = void 0;
	}
}
async function Hi(e, t) {
	let n = e._api();
	if (!n || e._templateAction) return;
	let r = e._templateNameInputValue(t).trim();
	if (!r) {
		e._error = e._t("templateNameRequired");
		return;
	}
	let i = e._normalizeDraftBlocks("template");
	if (!i.ok) {
		e._error = i.error;
		return;
	}
	e._templateAction = "save", e._error = void 0, e._saveMessage = void 0;
	try {
		let a = await n.setScheduleTemplate(t.key, r, i.blocks);
		e._applyScheduleData(a), e._selectedTemplateKey = t.key, e._templateNameDraftKey = t.key, e._templateNameDraft = r, e._resetTemplateDraft(e._scheduleTemplates().find((e) => e.key === t.key)), e._showSuccess(e._t("templateSaved"));
	} catch (t) {
		e._error = t instanceof Error ? t.message : e._t("unableSaveTemplate");
	} finally {
		e._templateAction = void 0;
	}
}
function Ui(e, t) {
	return Xt(t, e._scheduleTemplates());
}
function Wi(e) {
	e._templateApplyOpen = !e._templateApplyOpen, e._saveMessage = void 0;
}
function Gi(e, t) {
	return Qt(e, t);
}
function Ki(e, t, n, r) {
	!k.includes(n) || !(e._data?.configured_entities ?? []).includes(t) || (e._templateApplyTargets = $t(e._templateApplyTargets, t, n, r), e._saveMessage = void 0);
}
async function qi(e, t) {
	let n = e._api();
	if (!n || e._applyingTemplateTargets || e._templateApplyTargets.size === 0) return;
	let r = e._normalizeDraftBlocks("template");
	if (!r.ok) {
		e._error = r.error;
		return;
	}
	let i = en(e._templateApplyTargets, e._data?.configured_entities ?? []);
	if (i.length) {
		for (let t of i) {
			let n = e._unsupportedModeError(r.blocks, t.entityId);
			if (n) {
				e._error = n;
				return;
			}
		}
		e._applyingTemplateTargets = !0, e._error = void 0, e._saveMessage = void 0;
		try {
			let a;
			for (let t of i) a = await n.setDailySchedule(t.entityId, t.weekday, e._clampBlocksForEntity(r.blocks, t.entityId));
			a && e._applyScheduleData(a, { forceDraft: !0 }), e._selectedTemplateKey = t.key, e._templateApplyTargets = /* @__PURE__ */ new Set(), e._templateApplyOpen = !1, e._showSuccess(e._t("appliedTemplateTargets", { count: i.length }));
		} catch (t) {
			e._error = t instanceof Error ? t.message : e._t("unableCopy");
		} finally {
			e._applyingTemplateTargets = !1;
		}
	}
}
function Ji(e) {
	let t = e._scheduleTemplates().find((t) => t.key === e._selectedTemplateKey);
	if (!t) return !1;
	if (e._selectedEntity) {
		let n = e._unsupportedModeError(t.blocks, e._selectedEntity);
		if (n) return e._error = n, e._saveMessage = void 0, !1;
	}
	return e._draftBlocks.length && !window.confirm(e._t("confirmTemplate", {
		template: e._templateLabel(t),
		weekday: e._weekdayName(e._selectedWeekday)
	})) ? !1 : (e._draftBlocks = Yi(t.blocks), e._markDirty(), e._saveMessage = void 0, !0);
}
function Yi(e) {
	return e.map((e) => ({
		action: e.action,
		hvac_mode: e.hvac_mode ?? "",
		start: e.start,
		temperature: e.temperature
	}));
}
async function Xi(e, t) {
	let n = e._api();
	if (!n || e._templateAction) return;
	let r = e._scheduleTemplates().find((t) => t.key === e._selectedTemplateKey);
	if (!t && !r) return;
	let i = window.prompt(e._t("customTemplateName"), !t && r ? e._templateLabel(r) : "")?.trim();
	if (!i) return;
	let a = e._normalizeDraftBlocks();
	if (!a.ok) {
		e._error = a.error;
		return;
	}
	e._templateAction = "save", e._error = void 0, e._saveMessage = void 0;
	try {
		let o = t ? e._newTemplateKey() : r?.key ?? e._newTemplateKey(), s = await n.setScheduleTemplate(o, i, a.blocks);
		e._applyScheduleData(s), e._selectedTemplateKey = o, e._showSuccess(e._t("templateSaved"));
	} catch (t) {
		e._error = t instanceof Error ? t.message : e._t("unableSaveTemplate");
	} finally {
		e._templateAction = void 0;
	}
}
function Zi() {
	return Zt();
}
async function Qi(e) {
	let t = e._api();
	if (!t || e._templateAction) return;
	let n = e._scheduleTemplates().find((t) => t.key === e._selectedTemplateKey);
	if (n && window.confirm(e._t("confirmDeleteTemplate", { template: e._templateLabel(n) }))) {
		e._templateAction = "delete", e._error = void 0, e._saveMessage = void 0;
		try {
			let r = await t.deleteScheduleTemplate(n.key);
			e._applyScheduleData(r), e._selectedTemplateKey = "", e._showSuccess(e._t("templateDeleted"));
		} catch (t) {
			e._error = t instanceof Error ? t.message : e._t("unableDeleteTemplate");
		} finally {
			e._templateAction = void 0;
		}
	}
}
//#endregion
//#region src/velair/host-types.ts
function $i(e) {
	return e;
}
//#endregion
//#region src/velair/views/notice-view.ts
function ea(e, t, n) {
	return b`
    <div class=${`notice ${t}`}>
      <span>${n}</span>
      <button class="notice-close" type="button" title=${e._t("dismiss")} @click=${() => e._dismissNotice(t)}>
        <ha-icon icon="mdi:close"></ha-icon>
      </button>
      ${t === "success" ? b`
            <div class="notice-progress-track">
              <div class="notice-progress-fill" style=${`width: ${e._successNoticeProgress()}%;`}></div>
            </div>
          ` : S}
    </div>
  `;
}
//#endregion
//#region src/velair/controllers/overview-data.ts
function K(e) {
	return e;
}
function q(e, t, n) {
	let r = n?.override ?? e._data?.active_overrides?.[t];
	return Bn(r) ? r : void 0;
}
function ta(e) {
	return e._data ? e._orderedZoneIds(e._data.configured_entities).filter((t) => {
		let n = e._data?.zones[t];
		return !!q(e, t, n);
	}) : [];
}
function na(e, t, n) {
	return Vn(n?.override) ? n?.override ?? void 0 : void 0;
}
function ra(e, t, n) {
	let r = Number(n.temperature), i = I(n.until), a = typeof n.hvac_mode == "string" ? n.hvac_mode : "", o = [];
	return Number.isFinite(r) && o.push(e._formatTemperature(r, t)), a && o.push(e._modeLabel(a)), i && o.push(`${e._t("boostUntil")}: ${e._formatRemaining(Math.max(0, i - Date.now()))}`), o.join(" - ") || e._t("boostActive");
}
function ia(e, t) {
	let n = I(t.started_at), r = I(t.until), i = [];
	return n && i.push(`${e._t("pauseFrom")}: ${e._formatDateTime(new Date(n).toISOString())}`), r ? (i.push(`${e._t("pauseTo")}: ${e._formatDateTime(new Date(r).toISOString())}`), i.push(`${e._t("pauseRemaining")}: ${e._formatRemaining(Math.max(0, r - Date.now()))}`), i.join(" - ")) : (i.push(e._t("pauseIndefinite")), i.join(" - "));
}
function aa(e) {
	if (!e._data) return [];
	let t = e._orderedZoneIds(e._data.configured_entities).map((t) => oa(e, t, e._data?.zones[t])).filter((e) => !!e).sort((e, t) => new Date(e.when).getTime() - new Date(t.when).getTime());
	return t.length ? t : e._data.next_events;
}
function oa(e, t, n) {
	return an(t, n, q(e, t, n));
}
function sa() {
	return un(/* @__PURE__ */ new Date());
}
function ca(e, t) {
	let n = e.hass?.states?.[t]?.attributes, r = n?.current_temperature ?? n?.temperature;
	if (typeof r == "number") return e._formatTemperature(r, t);
}
function la(e, t) {
	let n = e.hass?.states?.[t], r = n?.state;
	if (!r || r === "unknown" || r === "unavailable") return;
	let i = n.attributes?.hvac_action;
	return i && i !== r && i !== "idle" ? `${e._modeLabel(r)} - ${e._hvacActionLabel(i)}` : e._modeLabel(r);
}
//#endregion
//#region src/velair/views/overview-view.ts
function ua(e) {
	let t = e._pauseExpirationMs();
	return t && t > Date.now() ? {
		detail: e._t("overviewStatusPausedDetail"),
		icon: "mdi:pause-circle",
		label: e._t("overviewStatusPaused"),
		state: "paused"
	} : e._data?.global.mode === "paused" || e._data?.operational_status === "paused" ? {
		detail: e._t("overviewStatusStoppedDetail"),
		icon: "mdi:stop-circle",
		label: e._t("overviewStatusStopped"),
		state: "stopped"
	} : {
		detail: e._t("overviewStatusRunningDetail"),
		icon: "mdi:play-circle",
		label: e._t("overviewStatusRunning"),
		state: "running"
	};
}
function da(e, t) {
	if (!e._data) return S;
	let n = ua(e);
	return b`
    <section class="overview-summary">
      <div class=${`overview-status-card status-${n.state}`}>
        <div class="overview-status-heading">
          <div class="overview-scheduler-state">
            <span class="label">${e._t("status")}</span>
            <span class=${`overview-state-value ${n.state}`}>
              <ha-icon icon=${n.icon}></ha-icon>
              <strong>${n.label}</strong>
            </span>
          </div>
          ${Ba(e)}
          <span class="overview-scheduler-detail">${n.detail}</span>
        </div>
        ${Va(e)}
      </div>
    </section>
  `;
}
function fa(e) {
	if (!e._data) return S;
	let t = K(e), n = ta(t);
	return b`
    <section class="overview-boost-panel">
      ${J(e._t("activeBoosts"), "mdi:lightning-bolt")}
      ${n.length ? b`
            <div class="event-list overview-boost-list">
              ${n.map((n) => {
		let r = q(t, n, e._data?.zones[n]);
		return b`
                  <div class="event">
                    <div>
                      <strong>${e._friendlyEntityName(n)}</strong>
                    </div>
                    ${r ? pa(e, n, r) : b`<span>${e._t("boostActive")}</span>`}
                  </div>
                `;
	})}
            </div>
          ` : b`<span class="overview-muted">${e._t("noActiveBoosts")}</span>`}
    </section>
  `;
}
function pa(e, t, n) {
	let r = Number(n.temperature), i = typeof n.until == "string" ? new Date(n.until).getTime() : void 0, a = typeof n.hvac_mode == "string" ? n.hvac_mode : "";
	return b`
    <div class="event-details">
      <span class="event-time">${i && !Number.isNaN(i) ? `${e._formatDateTime(new Date(i).toISOString())} (${e._formatRemaining(Math.max(0, i - Date.now()))})` : e._t("boostActive")}</span>
      <strong class="event-target">${Number.isFinite(r) ? e._formatTemperature(r, t) : "-"}</strong>
      <span class="event-mode">${a ? e._modeLabel(a) : e._t("keepMode")}</span>
    </div>
  `;
}
function ma(e, t) {
	return !e._data || !t.length ? S : b`
    <section class="overview-zones">
      ${J(e._t("overviewZones"), "mdi:thermostat")}
      <div class="overview-zone-table-scroll">
        <div class="overview-zone-table" role="table" aria-label=${e._t("overviewZones")}>
          <div class="overview-zone-table-row header" role="row">
            <div class="overview-zone-cell sticky" role="columnheader">${e._t("thermostat")}</div>
            <div class="overview-zone-cell" role="columnheader">${e._t("currentTemperature")}</div>
            <div class="overview-zone-cell" role="columnheader">${e._t("targetTemperature")} / ${e._t("mode")}</div>
            <div class="overview-zone-cell" role="columnheader">${e._t("status")}</div>
          </div>
          ${t.map((t) => ha(e, t, e._data?.zones[t]))}
        </div>
      </div>
    </section>
  `;
}
function ha(e, t, n) {
	let r = K(e), i = q(r, t, n), a = na(r, t, n), o = i ?? a, s = n ? sn(t, n, /* @__PURE__ */ new Date()) : void 0, c = ca(r, t) ?? "-", l = ba(e, t, s, o), u = xa(e, t, s, o);
	return b`
    <div class="overview-zone-table-row" role="row">
      <div class="overview-zone-cell sticky name" role="cell">
        <strong>${e._friendlyEntityName(t)}</strong>
        <span>${t}</span>
      </div>
      <div class="overview-zone-cell" role="cell">
        <strong>${c}</strong>
      </div>
      <div class="overview-zone-cell" role="cell">
        ${ga(e, t, l, u, o)}
      </div>
      <div class="overview-zone-cell" role="cell">
        ${ya(e, t, i, a)}
      </div>
    </div>
  `;
}
function ga(e, t, n, r, i) {
	let a = b`
    ${_a(e, t, n.effective, r.effective, "effective")}
  `;
	if (!i || n.base === n.effective && r.base === r.effective) return b`<span class="overview-zone-setpoint">${a}</span>`;
	let o = i.type === "boost", s = o ? e._t("boostActive") : e._t("pauseActive");
	return b`
    <span class=${`overview-zone-setpoint overridden ${o ? "boost" : "pause"}`}>
      ${_a(e, t, n.base, r.base, "previous")}
      <span class="overview-zone-transition" title=${s} aria-label=${s}>
        <span class="overview-zone-transition-symbol">
          <ha-icon class="overview-zone-cause" icon=${o ? "mdi:fire" : "mdi:pause-circle"}></ha-icon>
          <ha-icon class="overview-zone-arrow" icon="mdi:arrow-right"></ha-icon>
        </span>
      </span>
      ${a}
    </span>
  `;
}
function _a(e, t, n, r, i) {
	return n === e._t("off") && r === e._t("off") ? b`
      <span class=${`overview-zone-state ${i}`}>
        <strong>${e._t("off")}</strong>
      </span>
    ` : b`
    <span class=${`overview-zone-state ${i}`}>
      <strong>${n}</strong>
      ${i === "effective" ? va(e, t, r) : b`<span>${r}</span>`}
    </span>
  `;
}
function va(e, t, n) {
	return b`
    <span class="overview-mode-value">
      <span>${n}</span>
    </span>
  `;
}
function ya(e, t, n, r) {
	return n ? b`
      <span class="overview-zone-status boost">
        <ha-icon icon="mdi:fire"></ha-icon>
        <span>${ra(K(e), t, n)}</span>
      </span>
    ` : r ? b`
      <span class="overview-zone-status pause">
        <ha-icon icon="mdi:pause-circle"></ha-icon>
        <span>${ia(K(e), r)}</span>
      </span>
    ` : b`<span class="overview-muted">-</span>`;
}
function ba(e, t, n, r) {
	let i = Sa(e, t), a = n ? Ca(e, n) : i;
	if (!r) return {
		base: a,
		effective: i
	};
	if (r.type === "boost") {
		let n = Number(r.temperature);
		return {
			base: a,
			effective: Number.isFinite(n) ? e._formatTemperature(n, t) : i
		};
	}
	return r.type === "pause" && r.action === "turn_off" ? {
		base: a,
		effective: e._t("off")
	} : {
		base: a,
		effective: i
	};
}
function xa(e, t, n, r) {
	let i = la(K(e), t) ?? "-", a = n ? wa(e, n) : i;
	return r ? r.type === "boost" && typeof r.hvac_mode == "string" && r.hvac_mode ? {
		base: a,
		effective: e._modeLabel(r.hvac_mode)
	} : r.type === "pause" && r.action === "turn_off" ? {
		base: a,
		effective: e._t("off")
	} : {
		base: a,
		effective: i
	} : {
		base: a,
		effective: i
	};
}
function Sa(e, t) {
	let n = e.hass?.states?.[t];
	if (!n || n.state === "unknown" || n.state === "unavailable") return "-";
	if (n.state === "off") return e._t("off");
	let r = n.attributes?.temperature;
	return typeof r == "number" ? e._formatTemperature(r, t) : "-";
}
function Ca(e, t) {
	return t.action === "turn_off" || t.hvac_mode === "off" ? e._t("off") : typeof t.temperature == "number" ? e._formatTemperature(t.temperature, t.entity_id) : "-";
}
function wa(e, t) {
	return t.action === "turn_off" || t.hvac_mode === "off" ? e._t("off") : t.hvac_mode ? e._modeLabel(t.hvac_mode) : e._t("keepMode");
}
function Ta(e, t) {
	if (!e._data || !t.length) return S;
	let n = Un(e._currentTimelineNow()), r = sa();
	return b`
    <section class="overview-timeline-panel">
      ${J(e._t("todayTimeline"), "mdi:timeline-clock-outline")}
      <div class="overview-timeline-scroll">
        <div class="overview-timeline-layout">
          <div class="overview-timeline-names">
            <div class="overview-timeline-axis-spacer"></div>
            ${t.map((t) => Da(e, t))}
          </div>
          <div class="overview-timeline-rows" style=${`--overview-now-left: ${n.left}%;`}>
            <div class="overview-timeline-axis">
              <span>00</span>
              <span>06</span>
              <span>12</span>
              <span>18</span>
              <span>24</span>
              <div class="overview-timeline-now-label" title=${e._t("currentTime", { time: n.label })}>
                ${n.label}
              </div>
            </div>
            <div class="overview-timeline-now-line" aria-label=${e._t("currentTime", { time: n.label })}></div>
            ${t.map((t) => Ea(e, t, e._data?.zones[t]?.schedule?.[r] ?? []))}
          </div>
        </div>
      </div>
    </section>
  `;
}
function Ea(e, t, n) {
	let r = Gn(n), i = K(e), a = e._data?.zones[t], o = q(i, t, e._data?.zones[t]), s = na(i, t, a), c = o ? Kn(o, e._currentTimelineNow()) : void 0, l = s ? qn(s, e._currentTimelineNow()) : void 0;
	return b`
    <div class=${l?.indefinite ? "overview-timeline-track paused-indefinite" : "overview-timeline-track"}>
      ${r.length || c || l ? r.map((n) => Oa(e, t, n)) : b`<span class="overview-timeline-empty">${e._t("noBlocks")}</span>`}
      ${c && o ? ka(e, t, c, o) : S}
      ${l && s ? Aa(e, t, l, s) : S}
      ${e._overviewTimelineDetail && e._overviewTimelineDetailEntityId === t ? b`
            <div
              class=${`overview-timeline-tap-detail ${Ia(e._overviewTimelineDetailAnchor ?? 50)}`}
              role="status"
              style=${`--overview-detail-left: ${e._overviewTimelineDetailAnchor ?? 50}%;`}
            >
              <span>${e._overviewTimelineDetail}</span>
              <button
                type="button"
                title=${e._t("dismiss")}
                aria-label=${e._t("dismiss")}
                @click=${e._clearOverviewTimelineDetail}
              >
                <ha-icon icon="mdi:close"></ha-icon>
              </button>
            </div>
          ` : S}
    </div>
  `;
}
function Da(e, t) {
	let n = K(e), r = na(n, t, e._data?.zones[t]), i = e._friendlyEntityName(t), a = r ? ia(n, r) : "";
	return b`
    <div
      class=${r ? "overview-timeline-name paused" : "overview-timeline-name"}
      title=${r ? `${i} - ${e._t("pauseActive")} - ${a}` : i}
    >
      ${r ? b`<ha-icon icon="mdi:pause-circle" aria-hidden="true"></ha-icon>` : S}
      <span>${i}</span>
    </div>
  `;
}
function Oa(e, t, n) {
	let r = Na(e, t, n.block), i = ja(e, t, n.block), a = Ma(e, t, n.block);
	return b`
    <button
      class=${[
		"overview-timeline-block",
		`mode-${Zn(n.block)}`,
		n.width < 12 ? "compact" : "",
		n.width < 6 ? "tiny" : ""
	].filter(Boolean).join(" ")}
      type="button"
      style=${`left: ${n.left}%; width: ${n.width}%;`}
      title=${r}
      aria-label=${r}
      @click=${(i) => e._showOverviewTimelineDetail(t, r, n.left + n.width / 2, i)}
    >
      <span class="overview-timeline-block-main">
        <span>${i}</span>
        ${a ? b`<small>${a}</small>` : S}
      </span>
    </button>
  `;
}
function ka(e, t, n, r) {
	let i = Zn({ hvac_mode: n.block.hvac_mode ?? e.hass?.states?.[t]?.state }), a = `${e._t("boostActive")} - ${n.block.start} - ${Fa(n.endMinute)} - ${ra(K(e), t, r)}`;
	return b`
    <button
      class=${`overview-timeline-boost mode-${i}`}
      type="button"
      style=${`left: ${n.left}%; width: ${n.width}%;`}
      title=${a}
      aria-label=${a}
      @click=${(r) => e._showOverviewTimelineDetail(t, a, n.left + n.width / 2, r)}
    >
      <span class="overview-timeline-block-main">
        <ha-icon icon="mdi:lightning-bolt"></ha-icon>
        ${Number.isFinite(n.block.temperature) ? b`<span>${e._formatTemperature(Number(n.block.temperature), t)}</span>` : S}
      </span>
    </button>
  `;
}
function Aa(e, t, n, r) {
	let i = `${e._t("pauseActive")} - ${ia(K(e), r)}`;
	return b`
    <button
      class=${n.indefinite ? "overview-timeline-pause indefinite" : "overview-timeline-pause"}
      type="button"
      style=${`left: ${n.left}%; width: ${n.width}%;`}
      title=${i}
      aria-label=${i}
      @click=${(r) => e._showOverviewTimelineDetail(t, i, n.left + n.width / 2, r)}
    >
      <span class="overview-timeline-block-main">
        <ha-icon icon="mdi:pause"></ha-icon>
        <span>${e._t("pauseActive")}</span>
      </span>
    </button>
  `;
}
function ja(e, t, n) {
	return e._formatEventAction(Pa(t, n));
}
function Ma(e, t, n) {
	return n.action === "turn_off" || n.hvac_mode === "off" ? "" : e._formatEventMode(Pa(t, n));
}
function Na(e, t, n) {
	let r = ja(e, t, n), i = Ma(e, t, n);
	return [
		n.start,
		r,
		i
	].filter(Boolean).join(" - ");
}
function Pa(e, t) {
	return {
		action: t.action,
		entity_id: e,
		hvac_mode: t.hvac_mode ?? null,
		start: t.start,
		temperature: t.temperature ?? null,
		weekday: sa(),
		when: (/* @__PURE__ */ new Date()).toISOString()
	};
}
function Fa(e) {
	let t = Math.max(0, Math.min(1440, e)), n = Math.floor(t / 60), r = t % 60;
	return `${String(n).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
function Ia(e) {
	return e >= 72 ? "align-end" : e <= 28 ? "align-start" : "align-center";
}
function La(e) {
	let t = aa(K(e));
	return t.length ? b`
    <section class="next">
      ${J(e._t(t.length === 1 ? "nextEvent" : "nextEvents"), "mdi:calendar-clock")}
      <div class="event-list">
        ${t.map((t) => Ra(e, t))}
      </div>
    </section>
  ` : b`
      <section class="next">
        ${J(e._t("nextEvent"), "mdi:calendar-clock")}
        <p>${e._t("noUpcomingEvent")}</p>
      </section>
    `;
}
function J(e, t) {
	return b`
    <div class="overview-section-title section-heading">
      <ha-icon icon=${t}></ha-icon>
      <span class="section-label">${e}</span>
    </div>
  `;
}
function Ra(e, t) {
	return b`
    <div class="event">
      <div>
        <strong>${e._friendlyEntityName(t.entity_id)}</strong>
      </div>
      ${za(e, t)}
    </div>
  `;
}
function za(e, t) {
	return b`
    <div class="event-details">
      <span class="event-time">${e._formatDateTime(t.when)}</span>
      <strong class="event-target">${e._formatEventAction(t)}</strong>
      <span class="event-mode">${e._formatEventMode(t)}</span>
    </div>
  `;
}
function Ba(e) {
	let t = e._canResumeScheduler();
	return b`
    <div class="overview-controls">
      <label class="overview-pause-control">
        <span class="overview-pause-input">
          <input
            type="number"
            min="1"
            step="5"
            aria-label=${e._t("pauseDuration")}
            .value=${String(e._pauseDurationMinutes)}
            @input=${(t) => {
		e._pauseDurationMinutes = Math.max(1, Math.round(Number(e._inputValue(t)) || 1));
	}}
          />
          <span class="overview-pause-unit">min</span>
          <button
            class="overview-inline-button warning"
            type="button"
            title=${e._t("pause")}
            aria-label=${e._t("pause")}
            ?disabled=${e._controlAction === "pause"}
            @click=${() => e._pauseScheduler(!1, { showSuccess: !1 })}
          >
            <ha-icon icon="mdi:pause"></ha-icon>
          </button>
        </span>
      </label>
      <button
        class="overview-inline-button danger"
        type="button"
        title=${e._t("stop")}
        aria-label=${e._t("stop")}
        ?disabled=${e._controlAction === "pause"}
        @click=${() => e._pauseScheduler(!0, { showSuccess: !1 })}
      >
        <ha-icon icon="mdi:stop"></ha-icon>
      </button>
      <button
        class="overview-inline-button resume"
        type="button"
        title=${e._t("resume")}
        aria-label=${e._t("resume")}
        ?disabled=${!t || e._controlAction === "resume"}
        @click=${() => e._resumeScheduler({ showSuccess: !1 })}
      >
        <ha-icon icon="mdi:play"></ha-icon>
      </button>
    </div>
  `;
}
function Va(e) {
	let t = e._pauseExpirationMs();
	if (!t || t <= Date.now()) return S;
	let n = Math.max(0, t - Date.now()), r = e._pauseProgressPercent(t);
	return b`
    <div class="pause-progress">
      <div>
        <span>${e._t("pauseRemaining")}: ${e._formatRemaining(n)}</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style=${`width: ${r}%;`}></div>
      </div>
    </div>
  `;
}
//#endregion
//#region node_modules/lit-html/directive.js
var Ha = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), Ua = class {
	constructor(e) {}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AT(e, t, n) {
		this._$Ct = e, this._$AM = t, this._$Ci = n;
	}
	_$AS(e, t) {
		return this.update(e, t);
	}
	update(e, t) {
		return this.render(...t);
	}
}, { I: Wa } = ze, Ga = {}, Ka = (e, t = Ga) => e._$AH = t, Y = Ha(class extends Ua {
	constructor() {
		super(...arguments), this.key = S;
	}
	render(e, t) {
		return this.key = e, t;
	}
	update(e, [t, n]) {
		return t !== this.key && (Ka(e), this.key = t), n;
	}
});
//#endregion
//#region src/velair/views/schedule-view.ts
function qa(e, t, n, r) {
	return b`
    ${Ya(e, t, n)}
    ${n && r ? Xa(e, n, r) : b`<div class="notice">${e._t("noManagedEntities")}</div>`}
  `;
}
function Ja(e, t, n) {
	return b`
    <section class="zones">
      ${t.map((t) => b`
          <button
            type="button"
            class=${[
		"zone",
		t === n ? "active" : "",
		t === e._dirtyEntityId ? "dirty" : ""
	].filter(Boolean).join(" ")}
            @click=${() => e._selectEntity(t)}
          >
            ${e._friendlyEntityName(t)}
          </button>
        `)}
    </section>
  `;
}
function Ya(e, t, n) {
	return t.length ? b`
    <section class="schedule-zone-picker">
      <div class="schedule-step-heading">
        <strong>${e._t("scheduleStepClimate")}</strong>
      </div>
      ${Ja(e, t, n)}
    </section>
  ` : S;
}
function Xa(e, t, n) {
	let r = e._hasDraftValidationError("schedule");
	return b`
    <section class="schedule">
      <div class="schedule-editor-heading">
        <div>
          <strong>${e._t("scheduleStepDay")}</strong>
        </div>
        <div class="schedule-editor-badges">
          ${e._dirty && e._dirtyEntityId === t ? b`<span class="pill warning">${e._t("unsaved")}</span>` : S}
        </div>
      </div>
      ${Za(e, t, n)}
      <div class="day-tabs">
        ${e._orderedWeekdays().map((t) => Qa(e, t, n.schedule[t] ?? []))}
      </div>
      <div class="schedule-step-heading">
        <strong>${e._t("scheduleStepConfigure")}</strong>
      </div>
      <div class="editor">
        ${$a(e, t, "schedule")}
        <div class="schedule-config-helper">${e._t("templateOptionalHint")}</div>
        <div class="schedule-config-row">
          ${no(e)}
        </div>
        <div class="draft-list">
          ${e._draftBlocks.length ? b`
                ${ro(e)}
                ${e._draftBlocks.map((n, r) => Y(oo("schedule", t, e._selectedWeekday, r), ao(e, n, r, "schedule")))}
                ${io(e, "schedule")}
              ` : io(e, "schedule")}
        </div>
        <div class="schedule-save-actions">
          <button
            class="command-button primary"
            type="button"
            ?disabled=${e._templateAction === "save" || r}
            @click=${() => e._saveTemplate(!0)}
            title=${e._t("saveTemplate")}
          >
            <ha-icon icon="mdi:content-save-plus"></ha-icon>
            <span>${e._t("saveTemplate")}</span>
          </button>
          <button
            class="command-button primary"
            type="button"
            ?disabled=${e._saving || !e._dirty || r}
            @click=${e._saveSelectedDay}
          >
            <ha-icon icon="mdi:content-save"></ha-icon>
            <span>${e._t(e._saving ? "saving" : "save")}</span>
          </button>
        </div>
        <div class="schedule-copy-helper">${e._t("scheduleCopyHint")}</div>
        ${co(e)}
        ${uo(e)}
      </div>
    </section>
  `;
}
function Za(e, t, n) {
	let r = n.override ?? e._data?.active_overrides?.[t];
	if (!Bn(r)) return S;
	let i = Number(r.temperature), a = I(r.until), o = typeof r.hvac_mode == "string" ? r.hvac_mode : "";
	return b`
    <div class="boost-status">
      <ha-icon icon="mdi:lightning-bolt"></ha-icon>
      <div>
        <strong>${e._t("boostActive")}</strong>
        <span>
          ${Number.isFinite(i) ? b`${e._t("boostTarget")}: ${e._formatTemperature(i, t)}` : S}
          ${o ? b` - ${e._modeLabel(o)}` : S}
          ${a ? b` - ${e._t("boostUntil")}: ${e._formatRemaining(Math.max(0, a - Date.now()))}` : S}
        </span>
      </div>
    </div>
  `;
}
function Qa(e, t, n) {
	return b`
    <button
      type="button"
      class=${t === e._selectedWeekday ? "day-tab active" : "day-tab"}
      @click=${() => e._selectWeekday(t)}
    >
      <span>${e._weekdayName(t).slice(0, 3)}</span>
      <strong>${n.length}</strong>
    </button>
  `;
}
function $a(e, t, n = "schedule") {
	let r = e._timelineBlocks(n);
	return b`
    <div class="timeline-panel">
      <div class="timeline-header">
        <span class="label">${e._t("timeline")}</span>
        <div class="timeline-hours">
          <span>00</span>
          <span>06</span>
          <span>12</span>
          <span>18</span>
          <span>24</span>
          ${eo(e)}
        </div>
      </div>
      <div
        class="timeline-track"
        @dragover=${e._handleTimelineDragOver}
        @drop=${(t) => e._handleTimelineDrop(t, n)}
      >
        ${r.length ? r.map((r) => to(e, r, t, n)) : b`<span class="empty timeline-empty">${e._t("noBlocks")}</span>`}
      </div>
    </div>
  `;
}
function eo(e) {
	let t = Un(e._currentTimelineNow());
	return b`
    <div
      class="timeline-now-marker"
      style=${`--timeline-now-left: ${t.left}%;`}
      title=${e._t("currentTime", { time: t.label })}
      aria-label=${e._t("currentTime", { time: t.label })}
    >
      <span>${t.label}</span>
    </div>
  `;
}
function to(e, t, n, r = "schedule") {
	let i = t.draft.action === Je, a = Number(t.draft.temperature), o = i ? e._t("off") : Number.isFinite(a) ? e._formatTemperature(a, n) : e._t("invalidTemperatureRange"), s = i ? "" : t.draft.hvac_mode || e._t("keep");
	return b`
    <div
      class=${[
		"timeline-block",
		i ? "off" : "",
		`mode-${Zn(t.draft)}`,
		t.width < 5 ? "compact" : "",
		t.width < 2.5 ? "tiny" : ""
	].filter(Boolean).join(" ")}
      draggable="true"
      role="button"
      style=${`left: ${t.left}%; width: ${t.width}%;`}
      tabindex="0"
      title=${`${t.draft.start} - ${o}`}
      @dragstart=${(n) => e._handleTimelineDragStart(t.index, r, n)}
      @dragend=${e._handleTimelineDragEnd}
    >
      <div
        class="timeline-resize-handle left"
        title=${e._t("resizeStart")}
        draggable="false"
        @pointerdown=${(n) => e._handleTimelineResizeStart(t.index, "start", r, n)}
        @dragstart=${(e) => e.preventDefault()}
      ></div>
      <strong>${t.draft.start}</strong>
      <span>${o}</span>
      ${s ? b`<small>${s}</small>` : S}
      ${t.nextIndex === void 0 ? S : b`
            <div
              class="timeline-resize-handle right"
              title=${e._t("resizeEnd")}
              draggable="false"
              @pointerdown=${(n) => e._handleTimelineResizeStart(t.index, "end", r, n)}
              @dragstart=${(e) => e.preventDefault()}
            ></div>
          `}
    </div>
  `;
}
function no(e) {
	let t = e._scheduleTemplates();
	return b`
    <div class="template-panel">
      <div>
        <span class="label">${e._t("templates")}</span>
        <span class="select-wrap">
          <select
            .value=${e._selectedTemplateKey}
            ?disabled=${!t.length}
            @change=${(t) => {
		e._selectScheduleTemplate(e._inputValue(t));
	}}
          >
            ${t.length ? b`
                  <option value="">${e._t("selectTemplatePlaceholder")}</option>
                  ${t.map((t) => b`<option value=${t.key}>${e._templateLabel(t)}</option>`)}
                ` : b`<option value="">${e._t("noTemplates")}</option>`}
          </select>
        </span>
      </div>
    </div>
  `;
}
function ro(e) {
	return b`
    <div class="draft-list-header" aria-hidden="true">
      <span>${e._t("time")}</span>
      <span>${e._t("mode")}</span>
      <span>${e._t("temp")}</span>
      <span></span>
    </div>
  `;
}
function io(e, t = "schedule") {
	return b`
    <div class="draft-add-row">
      <button
        class="icon-button success draft-add-button"
        type="button"
        @click=${() => e._addBlock(t)}
        title=${e._t("addBlock")}
        aria-label=${e._t("addBlock")}
      >
        <ha-icon icon="mdi:plus"></ha-icon>
      </button>
    </div>
  `;
}
function ao(e, t, n, r = "schedule") {
	let i = (t.action || "set_temperature") === Je, a = i ? "off" : t.hvac_mode ?? "", o = e._temperatureError(t, r), [s, c] = e._temperatureLimits(r), l = e._temperatureStep(r), u = e._hvacModeOptions(r), d = a && !u.includes(a) ? [...u, a] : u;
	return b`
    <div class=${o ? "editable-block invalid" : "editable-block"}>
      <label>
        <span class="label">${e._t("start")}</span>
        <input
          type="time"
          .value=${t.start}
          @input=${(t) => e._updateDraftBlock(n, "start", e._inputValue(t), r)}
        />
      </label>
      <label>
        <span class="label">${e._t("mode")}</span>
        <span class="select-wrap">
          ${Y(so(r, n, a, d), b`
              <select
                value=${a}
                .value=${a}
                @change=${(t) => e._updateDraftBlock(n, "hvac_mode", e._inputValue(t), r)}
                @input=${(t) => e._updateDraftBlock(n, "hvac_mode", e._inputValue(t), r)}
              >
                <option value="" .selected=${a === ""}>${e._t("keep")}</option>
                ${d.map((t) => b`
                  <option value=${t} .selected=${t === a}>${e._modeLabel(t)}</option>
                `)}
              </select>
            `)}
        </span>
      </label>
      <label>
        <span class="label">${e._t("temp")}</span>
        <input
          class=${o ? "invalid" : ""}
          type="number"
          min=${String(s)}
          max=${String(c)}
          step=${String(l)}
          ?disabled=${i}
          placeholder=${i ? e._t("off") : ""}
          .value=${i ? "" : String(t.temperature)}
          @input=${(t) => e._updateDraftBlock(n, "temperature", e._inputValue(t), r)}
          @change=${(t) => e._updateDraftBlock(n, "temperature", e._inputValue(t), r)}
        />
        ${o ? b`<small class="field-error">${o}</small>` : S}
      </label>
      <button
        class="icon-button danger"
        type="button"
        @click=${() => e._removeBlock(n, r)}
        title=${e._t("deleteBlock")}
      >
        <ha-icon icon="mdi:trash-can"></ha-icon>
      </button>
    </div>
  `;
}
function oo(e, t, n, r) {
	return [
		e,
		t ?? "",
		n ?? "",
		r
	].join(":");
}
function so(e, t, n, r) {
	return [
		e,
		t,
		n,
		r.join(",")
	].join(":");
}
function co(e) {
	let t = e._orderedWeekdays();
	return b`
    <div class="copy-panel">
      <div class="copy-header">
        <div>
          <span class="label">${e._t("cloneDayToDays")}</span>
          <strong>${e._t("otherDays")}</strong>
        </div>
      </div>
      <div class="copy-targets">
        ${t.map((t) => lo(e, t))}
      </div>
      <div class="copy-actions">
        <button
          class="command-button success"
          type="button"
          ?disabled=${e._copying || e._copyTargets.size === 0 || e._hasDraftValidationError()}
          @click=${e._copySelectedDay}
        >
          <ha-icon icon="mdi:content-copy"></ha-icon>
          <span>${e._t(e._copying ? "applying" : "cloneAction")}</span>
        </button>
      </div>
    </div>
  `;
}
function lo(e, t) {
	return t === e._selectedWeekday ? b`
      <span class="check-target disabled" title=${e._weekdayName(t)}>
        <span>${e._shortWeekdayName(t)}</span>
      </span>
    ` : b`
    <label class="check-target" title=${e._weekdayName(t)}>
      <input
        type="checkbox"
        .checked=${e._copyTargets.has(t)}
        @change=${(n) => e._toggleCopyTarget(t, n.currentTarget.checked)}
      />
      <span>${e._shortWeekdayName(t)}</span>
    </label>
  `;
}
function uo(e) {
	let t = e._orderedZoneIds(e._data?.configured_entities ?? []).filter((t) => t !== e._selectedEntity);
	return t.length ? b`
    <div class="copy-panel">
      <div class="copy-header">
        <div>
          <span class="label">${e._t("cloneDayToThermostats")}</span>
          <strong>${e._t("otherThermostats")}</strong>
        </div>
      </div>
      <div class="copy-targets wide">
        ${t.map((t) => b`
            <label class="check-target">
              <input
                type="checkbox"
                .checked=${e._zoneTargets.has(t)}
                @change=${(n) => e._toggleZoneTarget(t, n.currentTarget.checked)}
              />
              <span>${e._friendlyEntityName(t)}</span>
            </label>
          `)}
      </div>
      <div class="copy-actions">
        <button
          class="command-button success"
          type="button"
          ?disabled=${e._applyingZones || e._zoneTargets.size === 0 || e._hasDraftValidationError()}
          @click=${e._applySelectedDayToZones}
        >
          <ha-icon icon="mdi:content-copy"></ha-icon>
          <span>${e._t(e._applyingZones ? "applying" : "cloneAction")}</span>
        </button>
      </div>
    </div>
  ` : S;
}
//#endregion
//#region src/velair/views/settings-view.ts
function fo(e, t) {
	let n = e._firstWeekday(), r = !!e._data?.settings?.apply_active_schedule_on_startup;
	return b`
    <section class="settings-view">
      <label class="settings-field">
        <span class="label">${e._t("firstWeekday")}</span>
        <span class="select-wrap">
          <select
            .value=${n}
            value=${n}
            @change=${(t) => e._updateSettingsFirstWeekday(e._inputValue(t))}
          >
            ${k.map((t) => b`
                <option value=${t} ?selected=${t === n}>
                  ${e._weekdayName(t)}
                </option>
              `)}
          </select>
        </span>
      </label>

      <section class="settings-startup">
        <ha-icon class="settings-startup-icon" icon="mdi:home-clock"></ha-icon>
        <div class="settings-startup-copy">
          <span class="section-label">${e._t("applyScheduleOnStartup")}</span>
          <p>${e._t("applyScheduleOnStartupDescription")}</p>
        </div>
        <ha-switch
          .checked=${r}
          ?disabled=${e._settingsSaving}
          @change=${(t) => e._saveSettings({ apply_active_schedule_on_startup: !!t.target.checked })}
        ></ha-switch>
      </section>

      ${ho(e)}

      <section class="settings-zone-order">
        <div class="section-heading">
          <ha-icon icon="mdi:sort"></ha-icon>
          <div>
            <span class="section-label">${e._t("zoneOrder")}</span>
            <p>${e._t("reorderZones")}</p>
          </div>
        </div>
        <div class="settings-zone-list">
          ${t.length ? t.map((n, r) => _o(e, n, r, t.length)) : b`<span class="empty">${e._t("noManagedEntities")}</span>`}
        </div>
      </section>

      ${po(e)}
    </section>
  `;
}
function po(e) {
	let t = e._data?.versions ?? {}, r = t.portable_model ?? 1, i = t.storage ?? 1, a = t.model ?? 1, o = e._maintenanceAction === "reset";
	return b`
    <section class="settings-maintenance">
      <div class="settings-portability-heading">
        <ha-icon class="settings-startup-icon" icon="mdi:wrench-clock"></ha-icon>
        <div>
          <span class="section-label">${e._t("maintenance")}</span>
          <p>${e._t("maintenanceDescription")}</p>
        </div>
      </div>

      <div class="maintenance-grid">
        ${mo(e._t("frontendBuild"), n)}
        ${mo(e._t("portableFormatVersion"), `v${r}`)}
        ${mo(e._t("internalStorageVersion"), `v${i} / v${a}`)}
        ${mo(e._t("integrationVersion"), "1.0.0")}
      </div>
    </section>

    <section class="settings-reset">
      <ha-icon class="settings-reset-icon" icon="mdi:delete-alert-outline"></ha-icon>
      <div class="settings-reset-copy">
        <span class="section-label">${e._t("resetVelair")}</span>
        <p>${e._t("resetVelairDescription")}</p>
      </div>
      <button
        class="command-button danger"
        type="button"
        ?disabled=${o}
        @click=${() => e._resetVelairData()}
      >
        <ha-icon icon="mdi:restore"></ha-icon>
        <span>${o ? e._t("resetting") : e._t("resetVelair")}</span>
      </button>
    </section>
  `;
}
function mo(e, t) {
	return b`
    <div class="maintenance-item">
      <span class="label">${e}</span>
      <strong>${t}</strong>
    </div>
  `;
}
function ho(e) {
	let t = e._importAvailableSections(), n = e._exportSections.size > 0 && !e._portabilityAction, r = !!e._importPayload && e._importSections.size > 0 && !e._portabilityAction, i = new Map(e._portableExportSummaryItems().map((e) => [e.section, e])), a = new Map(e._portableImportSummaryItems().map((e) => [e.section, e]));
	return b`
    <section class="settings-portability">
      <div class="settings-portability-heading">
        <ha-icon class="settings-startup-icon" icon="mdi:file-sync-outline"></ha-icon>
        <div>
          <span class="section-label">${e._t("portability")}</span>
          <p>${e._t("portabilityDescription")}</p>
        </div>
      </div>

      <div class="portability-grid">
        <div class="portability-card portability-export-card">
          <div class="portability-options">
            ${$e.map((t) => go(e, "export", t, e._exportSections.has(t), !1, i.get(t)))}
          </div>
          <button
            class="command-button primary"
            type="button"
            ?disabled=${!n}
            @click=${() => e._exportPortableData()}
          >
            <ha-icon icon="mdi:download"></ha-icon>
            <span>${e._portabilityAction === "export" ? e._t("saving") : e._t("exportData")}</span>
          </button>
        </div>

        <div class="portability-card">
          <label class="portable-file-field">
            <span class="label">${e._t("importFile")}</span>
            <span class="portable-file-control">
              <input
                type="file"
                accept="application/json,.json"
                ?disabled=${!!e._portabilityAction}
                @change=${(t) => e._handlePortableImportFile(t)}
              />
              <span class="portable-file-button">${e._t("chooseFile")}</span>
              <span class="portable-file-name">${e._importFileName || e._t("noFileSelected")}</span>
            </span>
          </label>
          ${e._importFileName ? b`<span class="empty">${e._t("portabilityFileReady", { file: e._importFileName })}</span>` : S}
          ${e._importPayload ? b`
                <div class="portable-warning" role="alert">
                  <ha-icon icon="mdi:alert-outline"></ha-icon>
                  <span>${e._t("importOverwriteWarning")}</span>
                </div>
              ` : S}
          <div class="portability-options">
            ${t.length ? t.map((t) => go(e, "import", t, e._importSections.has(t), !1, a.get(t))) : b`<span class="empty">${e._t("noImportSections")}</span>`}
          </div>
          <button
            class="command-button success"
            type="button"
            ?disabled=${!r}
            @click=${() => e._importPortableData()}
          >
            <ha-icon icon="mdi:upload"></ha-icon>
            <span>${e._portabilityAction === "import" ? e._t("applying") : e._t("importData")}</span>
          </button>
        </div>
      </div>
    </section>
  `;
}
function go(e, t, n, r, i, a) {
	return b`
    <label class="portable-option" title=${a?.title ?? e._portableSectionLabel(n)}>
      <input
        type="checkbox"
        .checked=${r}
        ?disabled=${i || !!e._portabilityAction}
        @change=${(r) => e._togglePortableSection(t, n, !!r.currentTarget.checked)}
      />
      ${a && typeof a.value == "number" ? b`<strong>${a.value}</strong>` : S}
      <span>${a?.label ?? e._portableSectionLabel(n)}</span>
    </label>
  `;
}
function _o(e, t, n, r) {
	let i = e._entityExists(t), [a, o] = e._entityTemperatureLimits(t), s = e._climateSupportedModes(t), c = e._climateProvidedData(t), l = e._entityDiagnostic(t);
	return b`
    <div
      class="settings-zone-row"
      draggable="true"
      @dragstart=${(n) => e._handleSettingsZoneDragStart(t, n)}
      @dragover=${(t) => e._handleSettingsZoneDragOver(t)}
      @drop=${(n) => e._handleSettingsZoneDrop(t, n)}
      @dragend=${e._handleSettingsZoneDragEnd}
    >
      <ha-icon icon="mdi:drag"></ha-icon>
      <div class="settings-zone-main">
        <div class="settings-zone-identity">
          <div class="settings-zone-title">
            <span
              class=${`settings-diagnostic-dot ${l.status}`}
              title=${l.tooltip}
              aria-label=${l.tooltip}
            ></span>
            <strong title=${e._friendlyEntityName(t)}>${e._friendlyEntityName(t)}</strong>
          </div>
          <span>${t}</span>
          ${l.status === "ok" ? S : b`<span class=${`settings-diagnostic-text ${l.status}`}>${l.messages.join(" · ")}</span>`}
        </div>
        ${i ? b`
              <div class="settings-capability-section settings-capability-row">
                <span class="label">${e._t("availableModes")}</span>
                <div class="settings-mode-tags">
                  ${s.length ? s.map((t) => b`
                          <span class=${`mode-chip mode-${mt(t)}`}>
                            ${e._modeLabel(t)}
                          </span>
                        `) : b`<span class="empty">${e._t("keep")}</span>`}
                </div>
              </div>
              <div class="settings-capability-composite">
                <div class="settings-capability-section settings-capability-row">
                  <span class="label">${e._t("temperatureRange")}</span>
                  <div class="settings-facts">
                    <span title=${e._t("temperatureRange")}>
                      <ha-icon icon="mdi:thermometer-lines"></ha-icon>
                      ${e._formatTemperatureLimit(a)}-${e._formatTemperatureLimit(o)}
                      ${e._temperatureUnit(t)}
                    </span>
                    <span title=${e._t("temperatureStep")}>
                      <ha-icon icon="mdi:delta"></ha-icon>
                      ${e._t("temperatureStep")}: ${e._formatTemperatureLimit(e._entityTemperatureStep(t))}
                    </span>
                  </div>
                </div>
                <div class="settings-capability-section settings-capability-row">
                  <span class="label">${e._t("providedData")}</span>
                  <div class="settings-data-icons">
                    ${c.map((e) => b`
                        <span title=${e.label} aria-label=${e.label}>
                          <ha-icon icon=${e.icon}></ha-icon>
                        </span>
                      `)}
                  </div>
                  ${c.length ? S : b`<span class="empty">${e._t("noUpcomingEvent")}</span>`}
                </div>
              </div>
            ` : S}
      </div>
      <div class="settings-row-actions">
        <button
          class="icon-button"
          type="button"
          title=${e._t("moveUp")}
          ?disabled=${n === 0}
          @click=${() => e._moveSettingsZone(t, -1)}
        >
          <ha-icon icon="mdi:chevron-up"></ha-icon>
        </button>
        <button
          class="icon-button"
          type="button"
          title=${e._t("moveDown")}
          ?disabled=${n === r - 1}
          @click=${() => e._moveSettingsZone(t, 1)}
        >
          <ha-icon icon="mdi:chevron-down"></ha-icon>
        </button>
      </div>
    </div>
  `;
}
//#endregion
//#region src/velair/views/templates-view.ts
function vo(e, t) {
	let n = e._scheduleTemplates(), r = n.find((t) => t.key === e._selectedTemplateKey), i = e._hasDraftValidationError("template"), a = r ? e._templateNameInputValue(r) : "", o = r ? e._templateDraftBlocks : [];
	return n.length ? b`
    <section class="template-library">
      <div class="template-library-layout">
        <div class=${e._templateListClass(n.length)}>
          <div class="template-list-heading">
            <div class="section-heading">
              <ha-icon icon="mdi:content-copy"></ha-icon>
              <span class="section-label">${e._t("templates")} (${n.length})</span>
            </div>
            <button
              class="icon-button primary"
              type="button"
              ?disabled=${e._templateAction === "save"}
              @click=${() => e._createTemplate()}
              title=${e._t("createTemplate")}
            >
              <ha-icon icon="mdi:plus"></ha-icon>
            </button>
          </div>
          <div class="template-list" @scroll=${e._handleTemplateListScroll}>
            ${n.map((t) => b`
                <div class=${t.key === r?.key ? "template-item active" : "template-item"}>
                  <button
                    class="template-item-main"
                    type="button"
                    @click=${() => e._selectTemplate(t.key)}
                  >
                    <strong>${e._templateLabel(t)}</strong>
                    <span>${e._t("blocks")}: ${t.blocks.length}</span>
                  </button>
                  <button
                    class="icon-button danger template-item-delete"
                    type="button"
                    ?disabled=${e._templateAction === "delete"}
                    @click=${(n) => {
		n.stopPropagation(), e._selectTemplate(t.key), e._deleteSelectedTemplate();
	}}
                    title=${e._t("deleteTemplate")}
                  >
                    <ha-icon icon="mdi:trash-can"></ha-icon>
                  </button>
                </div>
              `)}
          </div>
        </div>
        <div class="template-detail">
          ${r ? b`
                <div class="template-detail-heading">
                  <label class="template-name-field">
                    ${e._templateDirty ? b`<span class="pill warning">${e._t("unsaved")}</span>` : S}
                    <div class="template-name-input-wrap">
                      <ha-icon icon="mdi:pencil"></ha-icon>
                      <input
                        aria-label=${e._t("customTemplateName")}
                        .value=${a}
                        @input=${(t) => e._updateTemplateNameDraft(r.key, e._inputValue(t))}
                      />
                    </div>
                  </label>
                  <div class="template-detail-actions">
                    <button
                      class="command-button success template-apply-button"
                      type="button"
                      ?disabled=${!r || i}
                      @click=${() => {
		e._selectTemplate(r.key), e._toggleTemplateApplyPanel();
	}}
                      title=${e._t("applyToAction")}
                    >
                      <ha-icon icon="mdi:calendar-check"></ha-icon>
                      <span>${e._t("applyToAction")}</span>
                    </button>
                    <button
                      class="icon-button primary"
                      type="button"
                      ?disabled=${e._templateAction === "save" || !a.trim() || i}
                      @click=${() => {
		e._saveSelectedTemplateFromLibrary(r);
	}}
                      title=${e._t("save")}
                    >
                      <ha-icon icon="mdi:content-save"></ha-icon>
                    </button>
                  </div>
                </div>
                ${yo(e, r)}
                <div class="editor template-editor">
                  ${$a(e, t, "template")}
                  <div class="draft-list template-block-list">
                    ${o.length ? b`
                          ${ro(e)}
                          ${o.map((t, n) => Y(oo("template", r.key, void 0, n), ao(e, t, n, "template")))}
                          ${io(e, "template")}
                        ` : io(e, "template")}
                  </div>
                </div>
              ` : b`
                <div class="panel-empty embedded template-placeholder">
                  <ha-icon icon="mdi:content-copy"></ha-icon>
                  <div>
                    <h2>${e._t("templates")}</h2>
                    <p>${e._t("selectTemplateToBegin")}</p>
                  </div>
                </div>
              `}
        </div>
      </div>
    </section>
  ` : b`
      <section class="template-library">
        <div class="panel-empty embedded">
          <ha-icon icon="mdi:content-copy"></ha-icon>
          <div>
            <h2>${e._t("templates")}</h2>
            <p>${e._t("noTemplates")}</p>
          </div>
          <button
            class="icon-button primary"
            type="button"
            ?disabled=${e._templateAction === "save"}
            @click=${() => e._createTemplate()}
            title=${e._t("createTemplate")}
          >
            <ha-icon icon="mdi:plus"></ha-icon>
          </button>
        </div>
      </section>
    `;
}
function yo(e, t) {
	if (!e._templateApplyOpen) return S;
	let n = e._orderedZoneIds(e._data?.configured_entities ?? []), r = e._orderedWeekdays(), i = e._hasDraftValidationError("template"), a = e._templateApplyTargets.size > 0;
	return b`
    <div class="template-apply-panel">
      <div class="copy-header">
        <div>
          <span class="label">${e._t("applyTemplateTo", { template: e._templateLabel(t) })}</span>
        </div>
        <button
          class="command-button success"
          type="button"
          ?disabled=${e._applyingTemplateTargets || !a || i}
          @click=${() => e._applyTemplateToTargets(t)}
        >
          <ha-icon icon="mdi:check-circle-outline"></ha-icon>
          <span>${e._t(e._applyingTemplateTargets ? "applying" : "apply")}</span>
        </button>
      </div>
      ${n.length ? b`
            <div class="template-apply-scroll-wrap">
              <div class="template-apply-grid">
                <div class="template-apply-cell template-apply-zone header">${e._t("thermostat")}</div>
                ${r.map((t) => b`
                  <div class="template-apply-cell header day">${e._shortWeekdayName(t)}</div>
                `)}
                ${n.map((t) => b`
                  <div class="template-apply-cell template-apply-zone" title=${e._friendlyEntityName(t)}>
                    ${e._friendlyEntityName(t)}
                  </div>
                  ${r.map((n) => {
		let r = e._templateApplyTargetKey(t, n);
		return b`
                      <label class="template-apply-cell template-apply-day" title=${e._weekdayName(n)}>
                        <input
                          type="checkbox"
                          .checked=${e._templateApplyTargets.has(r)}
                          @change=${(r) => e._toggleTemplateApplyTarget(t, n, r.currentTarget.checked)}
                        />
                      </label>
                    `;
	})}
                `)}
              </div>
            </div>
          ` : b`<span class="empty">${e._t("noManagedEntities")}</span>`}
    </div>
  `;
}
//#endregion
//#region src/velair/views/card-content.ts
function bo(e) {
	let t = e._effectiveView(), n = e._orderedZoneIds(e._data?.configured_entities ?? []), r = e._selectedEntity ?? n[0], i = r ? e._data?.zones[r] : void 0;
	return b`
    <ha-card>
      <div
        class=${e._schedulerMenuOpen ? "card scheduler-dialog-open" : "card"}
        data-view=${t}
      >
        ${e._schedulerMenuOpen ? b`<button class="card-scrim" type="button" @click=${e._closeSchedulerMenu}></button>` : S}

        ${e._error ? ea(e, "error", e._error) : S}
        ${e._saveMessage ? ea(e, "success", e._saveMessage) : S}
        ${e._loading && !e._data ? b`<div class="notice">${e._t("loading")}</div>` : S}

        ${e._data ? xo(e, t, n, r, i) : S}
      </div>
    </ha-card>
  `;
}
function xo(e, t, n, r, i) {
	return t === "overview" ? b`
      ${da(e, n)}
      ${fa(e)}
      ${La(e)}
      ${Ta(e, n)}
      ${ma(e, n)}
    ` : t === "overview-status" ? da(e, n) : t === "overview-boosts" ? fa(e) : t === "overview-events" ? La(e) : t === "overview-timeline" ? Ta(e, n) : t === "overview-zones" ? ma(e, n) : t === "schedules" ? qa(e, n, r, i) : t === "templates" ? vo(e, r) : t === "settings" ? fo(e, n) : da(e, n);
}
//#endregion
//#region \0@oxc-project+runtime@0.133.0/helpers/esm/decorate.js
function X(e, t, n, r) {
	var i = arguments.length, a = i < 3 ? t : r === null ? r = Object.getOwnPropertyDescriptor(t, n) : r, o;
	if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a = Reflect.decorate(e, t, n, r);
	else for (var s = e.length - 1; s >= 0; s--) (o = e[s]) && (a = (i < 3 ? o(a) : i > 3 ? o(t, n, a) : o(t, n)) || a);
	return i > 3 && a && Object.defineProperty(t, n, a), a;
}
//#endregion
//#region src/velair/components/velair-card-element.ts
var Z = class extends E {
	constructor(...e) {
		super(...e), this.view = "overview-status", this._config = {}, this._loading = !1, this._saving = !1, this._selectedWeekday = "monday", this._draftBlocks = [], this._dirty = !1, this._copyTargets = /* @__PURE__ */ new Set(), this._copying = !1, this._zoneTargets = /* @__PURE__ */ new Set(), this._applyingZones = !1, this._selectedTemplateKey = "", this._templateNameDraft = "", this._templateNameDraftKey = "", this._templateDraftBlocks = [], this._templateDraftKey = "", this._templateDirty = !1, this._templateApplyOpen = !1, this._templateApplyTargets = /* @__PURE__ */ new Set(), this._applyingTemplateTargets = !1, this._templateListCanScrollUp = !1, this._templateListCanScrollDown = !1, this._settingsSaving = !1, this._exportSections = new Set($e), this._importSections = /* @__PURE__ */ new Set(), this._importFileName = "", this._pauseDurationMinutes = 60, this._schedulerMenuOpen = !1, this._nextEventsOpen = !1, this._timelineNow = /* @__PURE__ */ new Date(), this._subscribing = !1, this._hasExternalConfig = !1, this._handleTemplateListScroll = () => {
			this._syncTemplateListScrollIndicators();
		}, this._addBlock = (e = "schedule") => {
			Qn(R(this), e);
		}, this._applySelectedTemplate = () => Ji(G(this)), this._pauseScheduler = async (e, t = {}) => {
			await _n(L(this), e, t);
		}, this._resumeScheduler = async (e = {}) => {
			await vn(L(this), e);
		}, this._handleSchedulerMenuToggle = (e) => {
			bn(L(this), e);
		}, this._toggleNextEvents = () => {
			xn(L(this));
		}, this._handleTimelineDragOver = (e) => {
			Mr(e);
		}, this._handleTimelineDragEnd = () => {
			Fr(V(this));
		}, this._handleTimelineResizeMove = (e) => {
			Lr(V(this), e);
		}, this._handleTimelineResizeEnd = () => {
			Rr(V(this));
		}, this._handleSettingsZoneDragEnd = () => {
			kr(B(this));
		};
	}
	get hass() {
		return this._hass;
	}
	set hass(e) {
		let t = this._hass;
		this._hass = e, this._shouldUpdateForHass(e, t) && this.requestUpdate("hass", t);
	}
	_api() {
		return this.hass ? new qt(this.hass) : void 0;
	}
	setConfig(e) {
		this._hasExternalConfig = !0, this._config = e ?? {}, this._selectedEntity = e?.selected_entity, this._selectedWeekday = this._firstWeekday();
	}
	connectedCallback() {
		super.connectedCallback(), this._loadSchedule(), this._subscribeUpdates(), this._syncTimelineNowTick();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._unsubscribeUpdates &&= (this._unsubscribeUpdates(), void 0), this._clearSuccessNoticeTimer(), this._clearOverviewTimelineDetail(), this._stopPauseTick(), this._stopTimelineNowTick();
	}
	getCardSize() {
		return 8;
	}
	getGridOptions() {
		return {
			columns: 12,
			min_columns: 6,
			rows: 8,
			min_rows: 5
		};
	}
	static getStubConfig() {
		return {
			title: "Velair",
			view: "overview-status"
		};
	}
	static getConfigElement() {
		return document.createElement("velair-card-editor");
	}
	updated(e) {
		e.has("hass") && this.hass && !this._data && !this._loading && this._loadSchedule(), e.has("hass") && this.hass && this._subscribeUpdates(), e.has("_saveMessage") && !this._saveMessage && this._clearSuccessNoticeTimer(), this._effectiveView() === "templates" && (e.has("view") || e.has("_data") || e.has("_selectedTemplateKey") || e.has("_templateListCanScrollUp") || e.has("_templateListCanScrollDown")) && window.requestAnimationFrame(() => this._syncTemplateListScrollIndicators()), (e.has("view") || e.has("_data")) && this._syncTimelineNowTick();
	}
	render() {
		return bo($i(this));
	}
	_effectiveView() {
		return kt(this.getAttribute("view"), this.view, this._config.view);
	}
	_timelineShouldTick() {
		if (!this._data) return !1;
		let e = this._effectiveView();
		return e === "overview" || e.startsWith("overview-") || e === "schedules" || e === "templates";
	}
	_syncTimelineNowTick() {
		if (!this._timelineShouldTick()) {
			this._stopTimelineNowTick();
			return;
		}
		this._timelineNowTick === void 0 && (this._timelineNow = /* @__PURE__ */ new Date(), this._scheduleTimelineNowTick());
	}
	_scheduleTimelineNowTick() {
		this._stopTimelineNowTick();
		let e = /* @__PURE__ */ new Date(), t = Math.max(1e3, (60 - e.getSeconds()) * 1e3 - e.getMilliseconds() + 50);
		this._timelineNowTick = window.setTimeout(() => {
			this._timelineNowTick = void 0, this._timelineNow = /* @__PURE__ */ new Date(), this._syncTimelineNowTick();
		}, t);
	}
	_stopTimelineNowTick() {
		this._timelineNowTick !== void 0 && (window.clearTimeout(this._timelineNowTick), this._timelineNowTick = void 0);
	}
	_currentTimelineNow() {
		return this._timelineNow;
	}
	_showOverviewTimelineDetail(e, t, n, r) {
		window.matchMedia("(hover: none), (pointer: coarse)").matches && (r.preventDefault(), r.stopPropagation(), this._overviewTimelineDetail = t, this._overviewTimelineDetailAnchor = Math.max(0, Math.min(100, n)), this._overviewTimelineDetailEntityId = e);
	}
	_clearOverviewTimelineDetail() {
		this._overviewTimelineDetail = void 0, this._overviewTimelineDetailAnchor = void 0, this._overviewTimelineDetailEntityId = void 0;
	}
	_isCardView(e) {
		return M(e);
	}
	_shouldUpdateForHass(e, t) {
		return At(j(this), e, t);
	}
	_canResumeScheduler() {
		return gn(L(this));
	}
	_selectTemplate(e) {
		Ni(G(this), e);
	}
	_selectScheduleTemplate(e) {
		Pi(G(this), e);
	}
	_resetTemplateDraft(e) {
		Fi(G(this), e);
	}
	_templateListClass(e) {
		return Ii(G(this), e);
	}
	_syncTemplateListScrollIndicators() {
		Li(G(this));
	}
	_setTemplateListScrollIndicators(e, t) {
		Ri(G(this), e, t);
	}
	_templateNameInputValue(e) {
		return zi(G(this), e);
	}
	_updateTemplateNameDraft(e, t) {
		Bi(G(this), e, t);
	}
	async _createTemplate() {
		await Vi(G(this));
	}
	async _saveSelectedTemplateFromLibrary(e) {
		await Hi(G(this), e);
	}
	_uniqueTemplateName(e) {
		return Ui(G(this), e);
	}
	_scheduleTemplates() {
		return Jt(this._data?.templates);
	}
	_templateLabel(e) {
		return Yt(e);
	}
	async _loadSchedule() {
		await Qr(U(this));
	}
	async _subscribeUpdates() {
		await $r(U(this));
	}
	_applyScheduleData(e, t = {}) {
		ei(U(this), e, t);
	}
	_resetDraftBlocks() {
		ti(U(this));
	}
	_selectEntity(e) {
		ni(U(this), e);
	}
	_selectWeekday(e) {
		ri(U(this), e);
	}
	_blocksForSource(e) {
		return ii(U(this), e);
	}
	_setBlocksForSource(e, t) {
		ai(U(this), e, t);
	}
	_markBlocksDirty(e) {
		oi(U(this), e);
	}
	_toggleTemplateApplyPanel() {
		Wi(G(this));
	}
	_templateApplyTargetKey(e, t) {
		return Gi(e, t);
	}
	_toggleTemplateApplyTarget(e, t, n) {
		Ki(G(this), e, t, n);
	}
	async _applyTemplateToTargets(e) {
		await qi(G(this), e);
	}
	async _saveTemplate(e) {
		await Xi(G(this), e);
	}
	_newTemplateKey() {
		return Zi();
	}
	async _deleteSelectedTemplate() {
		await Qi(G(this));
	}
	_closeSchedulerMenu() {
		yn(L(this));
	}
	_removeBlock(e, t = "schedule") {
		$n(R(this), e, t);
	}
	_updateDraftBlock(e, t, n, r = "schedule") {
		er(R(this), e, t, n, r);
	}
	_markDirty() {
		tr(R(this));
	}
	_handleTimelineDragStart(e, t, n) {
		jr(V(this), e, t, n);
	}
	_handleTimelineDrop(e, t = "schedule") {
		Nr(V(this), e, t);
	}
	_handleTimelineResizeStart(e, t, n, r) {
		Ir(V(this), e, t, n, r);
	}
	_resizeTimelineBlock(e, t, n, r = "schedule") {
		zr(V(this), e, t, n, r);
	}
	_setDraftBlockStart(e, t, n = {}, r = "schedule") {
		nr(R(this), e, t, n, r);
	}
	_sortDraftBlocksByStart(e = "schedule") {
		Br(V(this), e);
	}
	_toggleCopyTarget(e, t) {
		rr(R(this), e, t);
	}
	_toggleZoneTarget(e, t) {
		ir(R(this), e, t);
	}
	_dismissNotice(e) {
		On(Dn(this), e);
	}
	_showSuccess(e) {
		kn(Dn(this), e);
	}
	_successNoticeProgress() {
		return An(Dn(this));
	}
	_clearSuccessNoticeTimer(e = !0) {
		jn(Dn(this), e);
	}
	_hasDraftValidationError(e = "schedule") {
		return or(ar(this), e);
	}
	_temperatureError(e, t = "schedule") {
		return sr(ar(this), e, t);
	}
	async _saveSelectedDay() {
		await Kr(H(this));
	}
	async _copySelectedDay() {
		await qr(H(this));
	}
	async _applySelectedDayToZones() {
		await Jr(H(this));
	}
	_normalizeDraftBlocks(e = "schedule") {
		return Yr(H(this), e);
	}
	_clampBlocksForEntity(e, t) {
		return Xr(H(this), e, t);
	}
	_unsupportedModeError(e, t) {
		return Zr(H(this), e, t);
	}
	_pauseExpirationMs() {
		return Sn(L(this));
	}
	_pauseProgressPercent(e) {
		return Cn(L(this), e);
	}
	_syncPauseTick() {
		wn(L(this));
	}
	_nextCountdownExpirationMs() {
		return Tn(L(this));
	}
	_stopPauseTick() {
		En(L(this));
	}
	_timelineBlocks(e = "schedule") {
		return Vr(V(this), e);
	}
	_inputValue(e) {
		return Ot(e);
	}
	_t(e, t = {}) {
		return jt(j(this), e, t);
	}
	_language() {
		return N(j(this));
	}
	_weekdayName(e) {
		return Mt(j(this), e);
	}
	_shortWeekdayName(e) {
		return Nt(j(this), e);
	}
	_modeLabel(e) {
		return this._dictionaryLabel("hvacModes", e);
	}
	_schedulerModeLabel(e) {
		return this._dictionaryLabel("schedulerModes", e);
	}
	_schedulerStatusLabel(e) {
		return this._dictionaryLabel("schedulerStatuses", e);
	}
	_hvacActionLabel(e) {
		return this._dictionaryLabel("hvacActions", e);
	}
	_dictionaryLabel(e, t) {
		return Pt(j(this), e, t);
	}
	_firstWeekday() {
		return Ft(j(this));
	}
	_orderedWeekdays() {
		return It(j(this));
	}
	_orderedZoneIds(e) {
		return Lt(j(this), e);
	}
	async _updateSettingsFirstWeekday(e) {
		await Cr(B(this), e);
	}
	async _saveSettings(e) {
		await wr(B(this), e);
	}
	_togglePortableSection(e, t, n) {
		fr(z(this), e, t, n);
	}
	async _handlePortableImportFile(e) {
		await pr(z(this), e);
	}
	async _exportPortableData() {
		await mr(z(this));
	}
	async _importPortableData() {
		await hr(z(this));
	}
	async _resetVelairData() {
		await gr(z(this));
	}
	_importAvailableSections() {
		return _r(z(this));
	}
	_portableExportSummaryItems() {
		return vr(z(this));
	}
	_portableImportSummaryItems() {
		return yr(z(this));
	}
	_portableSummaryItem(e) {
		return br(z(this), e);
	}
	_portableSectionLabel(e) {
		return xr(z(this), e);
	}
	_downloadPortablePayload(e) {
		Sr(e);
	}
	_moveSettingsZone(e, t) {
		Tr(B(this), e, t);
	}
	_handleSettingsZoneDragStart(e, t) {
		Er(B(this), e, t);
	}
	_handleSettingsZoneDragOver(e) {
		Dr(e);
	}
	_handleSettingsZoneDrop(e, t) {
		Or(B(this), e, t);
	}
	_updateSettingsZoneOrder(e) {
		Ar(B(this), e);
	}
	_temperatureLimits(e = "schedule", t = this._selectedEntity) {
		return hi(W(this), e, t);
	}
	_entityTemperatureLimits(e) {
		return gi(W(this), e);
	}
	_templateTemperatureLimits() {
		return _i(W(this));
	}
	_temperatureStep(e = "schedule", t = this._selectedEntity) {
		return vi(W(this), e, t);
	}
	_entityTemperatureStep(e) {
		return yi(W(this), e);
	}
	_formatTemperatureLimit(e) {
		return Et(e);
	}
	_entityExists(e) {
		return bi(W(this), e);
	}
	_friendlyEntityName(e) {
		return xi(W(this), e);
	}
	_climateSupportedModes(e) {
		return Si(W(this), e);
	}
	_hvacModeOptions(e = "schedule") {
		return Ci(W(this), e);
	}
	_uniqueModes(e) {
		return wi(e);
	}
	_entityDiagnostic(e) {
		return Ti(W(this), e);
	}
	_climateProvidedData(e) {
		return Ei(W(this), e);
	}
	_formatDateTime(e) {
		return Di(W(this), e);
	}
	_dateLocale() {
		return Oi(W(this));
	}
	_formatRemaining(e) {
		return ui(e);
	}
	_formatTemperature(e, t) {
		return ki(W(this), e, t);
	}
	_formatEventAction(e) {
		return Ai(W(this), e);
	}
	_formatEventMode(e) {
		return ji(W(this), e);
	}
	_temperatureUnit(e) {
		return Mi(W(this), e);
	}
	static {
		this.styles = Kt;
	}
};
X([D({ type: String })], Z.prototype, "view", void 0), X([O()], Z.prototype, "_config", void 0), X([O()], Z.prototype, "_data", void 0), X([O()], Z.prototype, "_error", void 0), X([O()], Z.prototype, "_loading", void 0), X([O()], Z.prototype, "_saving", void 0), X([O()], Z.prototype, "_saveMessage", void 0), X([O()], Z.prototype, "_selectedEntity", void 0), X([O()], Z.prototype, "_selectedWeekday", void 0), X([O()], Z.prototype, "_draftBlocks", void 0), X([O()], Z.prototype, "_dirty", void 0), X([O()], Z.prototype, "_dirtyEntityId", void 0), X([O()], Z.prototype, "_copyTargets", void 0), X([O()], Z.prototype, "_copying", void 0), X([O()], Z.prototype, "_zoneTargets", void 0), X([O()], Z.prototype, "_applyingZones", void 0), X([O()], Z.prototype, "_selectedTemplateKey", void 0), X([O()], Z.prototype, "_templateNameDraft", void 0), X([O()], Z.prototype, "_templateNameDraftKey", void 0), X([O()], Z.prototype, "_templateDraftBlocks", void 0), X([O()], Z.prototype, "_templateDraftKey", void 0), X([O()], Z.prototype, "_templateDirty", void 0), X([O()], Z.prototype, "_templateApplyOpen", void 0), X([O()], Z.prototype, "_templateApplyTargets", void 0), X([O()], Z.prototype, "_applyingTemplateTargets", void 0), X([O()], Z.prototype, "_templateListCanScrollUp", void 0), X([O()], Z.prototype, "_templateListCanScrollDown", void 0), X([O()], Z.prototype, "_templateAction", void 0), X([O()], Z.prototype, "_settingsSaving", void 0), X([O()], Z.prototype, "_maintenanceAction", void 0), X([O()], Z.prototype, "_portabilityAction", void 0), X([O()], Z.prototype, "_exportSections", void 0), X([O()], Z.prototype, "_importSections", void 0), X([O()], Z.prototype, "_importPayload", void 0), X([O()], Z.prototype, "_importFileName", void 0), X([O()], Z.prototype, "_pauseDurationMinutes", void 0), X([O()], Z.prototype, "_controlAction", void 0), X([O()], Z.prototype, "_schedulerMenuOpen", void 0), X([O()], Z.prototype, "_nextEventsOpen", void 0), X([O()], Z.prototype, "_overviewTimelineDetail", void 0), X([O()], Z.prototype, "_overviewTimelineDetailAnchor", void 0), X([O()], Z.prototype, "_overviewTimelineDetailEntityId", void 0), X([O()], Z.prototype, "_successNoticeStartedAt", void 0), X([O()], Z.prototype, "_timelineNow", void 0);
//#endregion
//#region src/velair/registration.ts
function So(e) {
	Object.entries(e.elements).forEach(([e, t]) => {
		customElements.get(e) || customElements.define(e, t);
	}), window.velairFrontendBuild = e.build, window.velairFrontendVersion = e.version || void 0, window.customCards = window.customCards ?? [], window.customCards.some((t) => t.type === e.customCard.type) || window.customCards.push(e.customCard);
}
//#endregion
//#region src/velair/views/card-editor.ts
var Q = class extends E {
	constructor(...e) {
		super(...e), this._config = {}, this._entities = [], this._loading = !1, this._loaded = !1, this._handleZoneDragEnd = () => {
			this._draggedEntity = void 0;
		};
	}
	setConfig(e) {
		this._config = e ?? {};
	}
	updated(e) {
		e.has("hass") && this.hass && !this._loaded && !this._loading && this._loadManagedEntities();
	}
	render() {
		let e = this._firstWeekday(), t = this._orderedEntities();
		return b`
      <div class="editor">
        ${this._error ? b`<div class="notice error">${this._error}</div>` : S}
        ${this._loading ? b`<div class="notice">${this._t("loadingEntities")}</div>` : S}

        <label>
          <span>${this._t("title")}</span>
          <input
            type="text"
            .value=${this._config.title ?? ""}
            placeholder="Velair"
            @input=${(e) => this._updateConfig("title", this._inputValue(e))}
          />
        </label>

        <label>
          <span>${this._t("cardView")}</span>
          <select
            .value=${this._config.view ?? "overview-status"}
            @change=${(e) => this._updateView(this._inputValue(e))}
          >
            ${Qe.map((e) => b`<option value=${e}>${this._viewLabel(e)}</option>`)}
          </select>
        </label>

        <label>
          <span>${this._t("firstWeekday")}</span>
          <select
            .value=${e}
            @change=${(e) => this._updateFirstWeekday(this._inputValue(e))}
          >
            ${k.map((e) => b`<option value=${e}>${this._weekdayName(e)}</option>`)}
          </select>
        </label>

        <section class="zone-order">
          <div>
            <span class="section-label">${this._t("zoneOrder")}</span>
            <p>${this._t("reorderZones")}</p>
          </div>
          <div class="zone-list">
            ${t.length ? t.map((e, n) => this._renderZoneOrderRow(e, n, t.length)) : b`<span class="empty">${this._t("noManagedEntities")}</span>`}
          </div>
        </section>
      </div>
    `;
	}
	_renderZoneOrderRow(e, t, n) {
		return b`
      <div
        class="zone-row"
        draggable="true"
        @dragstart=${(t) => this._handleZoneDragStart(e, t)}
        @dragover=${(e) => this._handleZoneDragOver(e)}
        @drop=${(t) => this._handleZoneDrop(e, t)}
        @dragend=${this._handleZoneDragEnd}
      >
        <ha-icon icon="mdi:drag"></ha-icon>
        <span>${this._friendlyEntityName(e)}</span>
        <div class="row-actions">
          <button
            class="icon-button"
            type="button"
            title=${this._t("moveUp")}
            ?disabled=${t === 0}
            @click=${() => this._moveZone(e, -1)}
          >
            <ha-icon icon="mdi:chevron-up"></ha-icon>
          </button>
          <button
            class="icon-button"
            type="button"
            title=${this._t("moveDown")}
            ?disabled=${t === n - 1}
            @click=${() => this._moveZone(e, 1)}
          >
            <ha-icon icon="mdi:chevron-down"></ha-icon>
          </button>
        </div>
      </div>
    `;
	}
	async _loadManagedEntities() {
		if (!(!this.hass || this._loading)) {
			this._loading = !0, this._error = void 0;
			try {
				let e = await this.hass.connection.sendMessagePromise({ type: "velair/get_schedule" });
				this._entities = e.configured_entities, this._loaded = !0;
			} catch (e) {
				this._error = e instanceof Error ? e.message : this._t("unableLoad"), this._entities = this._config.selected_entity ? [this._config.selected_entity] : [];
			} finally {
				this._loading = !1;
			}
		}
	}
	_orderedEntities() {
		let e = [...this._entities];
		this._config.selected_entity && !e.includes(this._config.selected_entity) && e.unshift(this._config.selected_entity);
		let t = new Set(e), n = (this._config.zone_order ?? []).filter((e) => t.has(e)), r = e.filter((e) => !n.includes(e));
		return [...n, ...r];
	}
	_updateConfig(e, t) {
		let n = { ...this._config }, r = t.trim();
		r ? n[e] = r : delete n[e], this._emitConfig(n);
	}
	_updateFirstWeekday(e) {
		let t = { ...this._config };
		t.first_weekday = k.includes(e) ? e : "monday", delete t.selected_weekday, this._emitConfig(t);
	}
	_moveZone(e, t) {
		let n = this._orderedEntities(), r = n.indexOf(e), i = r + t;
		if (r < 0 || i < 0 || i >= n.length) return;
		let a = [...n];
		[a[r], a[i]] = [a[i], a[r]], this._updateZoneOrder(a);
	}
	_handleZoneDragStart(e, t) {
		this._draggedEntity = e, t.dataTransfer?.setData("text/plain", e), t.dataTransfer && (t.dataTransfer.effectAllowed = "move");
	}
	_handleZoneDragOver(e) {
		e.preventDefault(), e.dataTransfer && (e.dataTransfer.dropEffect = "move");
	}
	_handleZoneDrop(e, t) {
		t.preventDefault();
		let n = t.dataTransfer?.getData("text/plain") || this._draggedEntity;
		if (this._draggedEntity = void 0, !n || n === e) return;
		let r = this._orderedEntities().filter((e) => e !== n), i = r.indexOf(e);
		i < 0 || (r.splice(i, 0, n), this._updateZoneOrder(r));
	}
	_updateZoneOrder(e) {
		let t = {
			...this._config,
			zone_order: e
		};
		delete t.selected_entity, this._emitConfig(t);
	}
	_emitConfig(e) {
		this._config = e, this.dispatchEvent(new CustomEvent("config-changed", {
			bubbles: !0,
			composed: !0,
			detail: { config: e }
		}));
	}
	_inputValue(e) {
		return e.currentTarget.value;
	}
	_t(e, t = {}) {
		return st(this._language(), e, t);
	}
	_updateView(e) {
		let t = { ...this._config };
		t.view = Qe.includes(e) ? e : "overview-status", this._emitConfig(t);
	}
	_language() {
		return ot(this.hass);
	}
	_firstWeekday() {
		let e = this._config.first_weekday ?? this._config.selected_weekday ?? "monday";
		return k.includes(e) ? e : "monday";
	}
	_weekdayName(e) {
		return ct(this._language(), e);
	}
	_viewLabel(e) {
		return this._t({
			overview: "overview",
			"overview-status": "cardViewOverviewStatus",
			"overview-boosts": "cardViewOverviewBoosts",
			"overview-events": "cardViewOverviewEvents",
			"overview-timeline": "cardViewOverviewTimeline",
			"overview-zones": "cardViewOverviewZones",
			schedules: "cardViewSchedules",
			templates: "templates",
			settings: "settings"
		}[e]);
	}
	_friendlyEntityName(e) {
		return this.hass?.states?.[e]?.attributes?.friendly_name ?? e;
	}
	static {
		this.styles = u`
    .editor {
      display: grid;
      gap: 16px;
      padding: 4px 0;
    }

    label span {
      color: var(--secondary-text-color);
      display: block;
      font-size: 12px;
      margin-bottom: 4px;
    }

    p {
      color: var(--secondary-text-color);
      font-size: 12px;
      margin: 4px 0 0;
    }

    .section-label {
      color: var(--primary-text-color);
      display: block;
      font-weight: 600;
    }

    input,
    select {
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      box-sizing: border-box;
      color: var(--primary-text-color);
      font: inherit;
      min-height: 40px;
      padding: 8px;
      width: 100%;
    }

    .notice {
      background: var(--secondary-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 12px;
    }

    .notice.error {
      background: color-mix(in srgb, var(--error-color) 12%, transparent);
      border-color: var(--error-color);
    }

    .zone-order,
    .zone-list {
      display: grid;
      gap: 8px;
    }

    .zone-row {
      align-items: center;
      background: var(--secondary-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      cursor: grab;
      display: grid;
      gap: 8px;
      grid-template-columns: 24px minmax(0, 1fr) auto;
      min-height: 42px;
      padding: 8px;
    }

    .zone-row:active {
      cursor: grabbing;
    }

    .zone-row span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .row-actions {
      display: inline-flex;
      gap: 4px;
    }

    .icon-button {
      align-items: center;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      color: var(--primary-text-color);
      cursor: pointer;
      display: inline-flex;
      height: 32px;
      justify-content: center;
      width: 32px;
    }

    .icon-button:disabled {
      cursor: default;
      opacity: 0.45;
    }

    .empty {
      color: var(--secondary-text-color);
      font-size: 12px;
    }
  `;
	}
};
X([D({ attribute: !1 })], Q.prototype, "hass", void 0), X([O()], Q.prototype, "_config", void 0), X([O()], Q.prototype, "_entities", void 0), X([O()], Q.prototype, "_loading", void 0), X([O()], Q.prototype, "_loaded", void 0), X([O()], Q.prototype, "_error", void 0);
//#endregion
//#region src/velair/views/tabs.ts
var Co = [
	{
		icon: "mdi:view-dashboard-outline",
		labelKey: "overview",
		view: "overview"
	},
	{
		icon: "mdi:calendar-clock",
		labelKey: "schedules",
		view: "schedules"
	},
	{
		icon: "mdi:content-copy",
		labelKey: "templates",
		view: "templates"
	},
	{
		icon: "mdi:cog-outline",
		labelKey: "settings",
		view: "settings"
	}
];
function wo(e) {
	return Co.find((t) => t.view === e)?.icon ?? "mdi:circle";
}
//#endregion
//#region src/velair/views/panel.ts
var $ = class extends E {
	constructor(...e) {
		super(...e), this.narrow = !1, this._activeView = "overview";
	}
	render() {
		return b`
      <main class=${this.narrow ? "panel narrow" : "panel"}>
        <div class="header">
          <div class="toolbar">
            <ha-menu-button .hass=${this.hass} .narrow=${!0}></ha-menu-button>
            <div class="main-title">Velair</div>
          </div>
          <ha-tab-group
            class="panel-tabs"
            .active=${this._activeView}
            active=${this._activeView}
          >
            ${Ze.map((e) => b`
                <ha-tab-group-tab
                  slot="nav"
                  panel=${e}
                  ?active=${e === this._activeView}
                  @click=${(t) => this._handleTabClick(e, t)}
                >
                  ${this._t(e)}
                </ha-tab-group-tab>
              `)}
          </ha-tab-group>
        </div>
        <section class="view panel-content">
          ${this._renderActiveView()}
        </section>
      </main>
    `;
	}
	_renderActiveView() {
		return Y(this._activeView, b`<velair-card
        .hass=${this.hass}
        .view=${this._activeView}
        view=${this._activeView}
      ></velair-card>`);
	}
	_handleTabClick(e, t) {
		t.preventDefault(), t.stopPropagation(), this._selectView(e, t);
	}
	_selectView(e, t) {
		Ze.includes(e) && (this._activeView = e, this._syncTabGroupActive(e, t));
	}
	_syncTabGroupActive(e, t) {
		let n = t instanceof Event ? t.currentTarget : t, r = n?.matches("ha-tab-group") ? n : n?.closest("ha-tab-group");
		r && (r.active = e, r.setAttribute("active", e), r.querySelectorAll("ha-tab-group-tab").forEach((t) => {
			let n = t.getAttribute("panel") === e;
			t.toggleAttribute("active", n), t.setAttribute("aria-selected", String(n)), t.setAttribute("tabindex", n ? "0" : "-1");
		}));
	}
	_toPanelView(e) {
		return this._isPanelView(e) ? e : void 0;
	}
	_isPanelView(e) {
		return typeof e == "string" && Ze.includes(e);
	}
	_viewIcon(e) {
		return wo(e);
	}
	_t(e, t = {}) {
		return st(this._language(), e, t);
	}
	_language() {
		return ot(this.hass);
	}
	static {
		this.styles = u`
    :host {
      display: block;
      min-height: 100%;
    }

    .panel {
      box-sizing: border-box;
      display: grid;
      gap: 0;
      min-height: 100%;
      width: 100%;
    }

    .panel.narrow {
      min-height: 100%;
    }

    .header {
      background: var(--app-header-background-color, var(--primary-background-color));
      border-bottom: 1px solid var(--divider-color);
      color: var(--app-header-text-color, var(--primary-text-color));
      box-sizing: border-box;
      min-height: 104px;
      position: fixed;
      top: 0;
      width: 100%;
      z-index: 2;
    }

    .toolbar {
      align-items: center;
      box-sizing: border-box;
      display: flex;
      height: 56px;
      padding: 0 16px;
    }

    ha-menu-button {
      display: none;
      flex: 0 0 auto;
    }

    .main-title {
      color: inherit;
      flex: 0 1 auto;
      font-size: 22px;
      font-weight: 400;
      letter-spacing: 0;
      line-height: 56px;
      margin: 0 0 0 24px;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .panel-tabs {
      color: var(--primary-text-color);
      display: block;
      height: 48px;
      --track-width: 2px;
      width: 100%;
    }

    ha-tab-group::part(nav) {
      margin-inline: 24px;
      min-height: 48px;
    }

    ha-tab-group::part(tabs) {
      border-block-end: 0;
      border-bottom: 0;
      display: flex;
      min-height: 48px;
    }

    ha-tab-group::part(scroll-button) {
      color: var(--secondary-text-color);
      flex: 0 0 1.5em;
      width: 1.5em;
    }

    ha-tab-group::part(scroll-button__base) {
      min-width: 1.5em;
      padding-inline: 0;
      width: 1.5em;
    }

    ha-tab-group-tab {
      border-block-end: solid var(--track-width) transparent;
      box-sizing: border-box;
      color: var(--secondary-text-color);
      flex: 0 0 auto;
      font-size: var(--ha-font-size-m);
      font-weight: 700;
    }

    ha-tab-group-tab::part(base) {
      align-items: center;
      box-sizing: border-box;
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      padding: 1em 1.5em;
      transition: color var(--wa-transition-fast) var(--wa-transition-easing);
      user-select: none;
      white-space: nowrap;
    }

    ha-tab-group-tab[active] {
      border-block-end: solid var(--track-width) var(--indicator-color);
      color: var(--primary-text-color);
      margin-block-end: 0 !important;
    }

    ha-tab-group-tab[active]::part(base) {
      color: var(--primary-text-color);
    }

    .panel-content {
      box-sizing: border-box;
      margin: 0 auto;
      max-width: 1120px;
      min-width: 0;
      padding: 120px 24px 24px;
      width: 100%;
    }

    velair-card {
      display: block;
    }

    .panel-empty {
      align-items: center;
      display: grid;
      gap: 16px;
      grid-template-columns: auto minmax(0, 1fr);
      padding: 20px;
    }

    .panel-empty ha-icon {
      color: var(--primary-color);
      height: 28px;
      width: 28px;
    }

    .panel-empty h2 {
      color: var(--primary-text-color);
      font-size: 18px;
      font-weight: 600;
      letter-spacing: 0;
      margin: 0;
    }

    @media (max-width: 870px) {
      .header {
        min-height: 104px;
      }

      .toolbar {
        height: 56px;
        padding: 0 16px;
      }

      ha-menu-button {
        display: block;
      }

      .main-title {
        font-size: 22px;
        line-height: 56px;
      }

      .panel-content {
        padding-top: 120px;
      }
    }

    @media (max-width: 640px) {
      .header {
        min-height: 104px;
      }

      .toolbar {
        height: 56px;
        padding: 0 16px;
      }

      .panel-content {
        padding: 112px 8px 16px;
      }
    }
  `;
	}
};
//#endregion
//#region src/velair-card.ts
X([D({ attribute: !1 })], $.prototype, "hass", void 0), X([D({ type: Boolean })], $.prototype, "narrow", void 0), X([D({ attribute: !1 })], $.prototype, "panel", void 0), X([D({ attribute: !1 })], $.prototype, "route", void 0), X([O()], $.prototype, "_activeView", void 0), So({
	build: n,
	customCard: {
		type: "velair-card",
		name: "Velair",
		description: "Climate automation that adapts to your life."
	},
	elements: {
		"velair-card": Z,
		"velair-card-editor": Q,
		"velair-main-panel": $
	},
	version: r
});
//#endregion
export { Z as VelairCard };

//# sourceMappingURL=velair-card.js.map