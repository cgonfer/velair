//#region \0rolldown/runtime.js
var e = Object.defineProperty, t = (t, n) => {
	let r = {};
	for (var i in t) e(r, i, {
		get: t[i],
		enumerable: !0
	});
	return n || e(r, Symbol.toStringTag, { value: "Module" }), r;
}, n = "20260807184239", r = "1.5.0", i = globalThis, a = i.ShadowRoot && (i.ShadyCSS === void 0 || i.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, o = Symbol(), s = /* @__PURE__ */ new WeakMap(), c = class {
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
}, f = a ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return l(t);
})(e) : e, { is: p, defineProperty: ee, getOwnPropertyDescriptor: te, getOwnPropertyNames: ne, getOwnPropertySymbols: re, getPrototypeOf: ie } = Object, ae = globalThis, m = ae.trustedTypes, oe = m ? m.emptyScript : "", se = ae.reactiveElementPolyfillSupport, h = (e, t) => e, ce = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? oe : null;
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
}, le = (e, t) => !p(e, t), ue = {
	attribute: !0,
	type: String,
	converter: ce,
	reflect: !1,
	useDefault: !1,
	hasChanged: le
};
Symbol.metadata ??= Symbol("metadata"), ae.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var de = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = ue) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && ee(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = te(this.prototype, e) ?? {
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
		return this.elementProperties.get(e) ?? ue;
	}
	static _$Ei() {
		if (this.hasOwnProperty(h("elementProperties"))) return;
		let e = ie(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(h("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(h("properties"))) {
			let e = this.properties, t = [...ne(e), ...re(e)];
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
			for (let e of n) t.unshift(f(e));
		} else e !== void 0 && t.push(f(e));
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
			let i = (n.converter?.toAttribute === void 0 ? ce : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? ce : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? le)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
de.elementStyles = [], de.shadowRootOptions = { mode: "open" }, de[h("elementProperties")] = /* @__PURE__ */ new Map(), de[h("finalized")] = /* @__PURE__ */ new Map(), se?.({ ReactiveElement: de }), (ae.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var fe = globalThis, pe = (e) => e, me = fe.trustedTypes, he = me ? me.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, ge = "$lit$", g = `lit$${Math.random().toFixed(9).slice(2)}$`, _e = "?" + g, ve = `<${_e}>`, _ = document, ye = () => _.createComment(""), be = (e) => e === null || typeof e != "object" && typeof e != "function", xe = Array.isArray, Se = (e) => xe(e) || typeof e?.[Symbol.iterator] == "function", Ce = "[ 	\n\f\r]", we = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Te = /-->/g, Ee = />/g, v = RegExp(`>|${Ce}(?:([^\\s"'>=/]+)(${Ce}*=${Ce}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), De = /'/g, Oe = /"/g, ke = /^(?:script|style|textarea|title)$/i, y = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), b = Symbol.for("lit-noChange"), x = Symbol.for("lit-nothing"), Ae = /* @__PURE__ */ new WeakMap(), S = _.createTreeWalker(_, 129);
function je(e, t) {
	if (!xe(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return he === void 0 ? t : he.createHTML(t);
}
var Me = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = we;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === we ? c[1] === "!--" ? o = Te : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = v) : (ke.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = v) : o = Ee : o === v ? c[0] === ">" ? (o = i ?? we, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? v : c[3] === "\"" ? Oe : De) : o === Oe || o === De ? o = v : o === Te || o === Ee ? o = we : (o = v, i = void 0);
		let d = o === v && e[t + 1].startsWith("/>") ? " " : "";
		a += o === we ? n + ve : l >= 0 ? (r.push(s), n.slice(0, l) + ge + n.slice(l) + g + d) : n + g + (l === -2 ? t : d);
	}
	return [je(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, Ne = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = Me(t, n);
		if (this.el = e.createElement(l, r), S.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = S.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(ge)) {
					let t = u[o++], n = i.getAttribute(e).split(g), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Le : r[1] === "?" ? Re : r[1] === "@" ? ze : Ie
					}), i.removeAttribute(e);
				} else e.startsWith(g) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (ke.test(i.tagName)) {
					let e = i.textContent.split(g), t = e.length - 1;
					if (t > 0) {
						i.textContent = me ? me.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], ye()), S.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], ye());
					}
				}
			} else if (i.nodeType === 8) if (i.data === _e) c.push({
				type: 2,
				index: a
			});
			else {
				let e = -1;
				for (; (e = i.data.indexOf(g, e + 1)) !== -1;) c.push({
					type: 7,
					index: a
				}), e += g.length - 1;
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = _.createElement("template");
		return n.innerHTML = e, n;
	}
};
function C(e, t, n = e, r) {
	if (t === b) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = be(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = C(e, i._$AS(e, t.values), i, r)), t;
}
var Pe = class {
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
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? _).importNode(t, !0);
		S.currentNode = r;
		let i = S.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new Fe(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Be(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = S.nextNode(), a++);
		}
		return S.currentNode = _, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, Fe = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = x, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = C(this, e, t), be(e) ? e === x || e == null || e === "" ? (this._$AH !== x && this._$AR(), this._$AH = x) : e !== this._$AH && e !== b && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? Se(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== x && be(this._$AH) ? this._$AA.nextSibling.data = e : this.T(_.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = Ne.createElement(je(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new Pe(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = Ae.get(e.strings);
		return t === void 0 && Ae.set(e.strings, t = new Ne(e)), t;
	}
	k(t) {
		xe(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(ye()), this.O(ye()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = pe(e).nextSibling;
			pe(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, Ie = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = x, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = x;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = C(this, e, t, 0), a = !be(e) || e !== this._$AH && e !== b, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = C(this, r[n + o], t, o), s === b && (s = this._$AH[o]), a ||= !be(s) || s !== this._$AH[o], s === x ? e = x : e !== x && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === x ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Le = class extends Ie {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === x ? void 0 : e;
	}
}, Re = class extends Ie {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== x);
	}
}, ze = class extends Ie {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = C(this, e, t, 0) ?? x) === b) return;
		let n = this._$AH, r = e === x && n !== x || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== x && (n === x || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Be = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		C(this, e);
	}
}, Ve = {
	M: ge,
	P: g,
	A: _e,
	C: 1,
	L: Me,
	R: Pe,
	D: Se,
	V: C,
	I: Fe,
	H: Ie,
	N: Re,
	U: ze,
	B: Le,
	F: Be
}, He = fe.litHtmlPolyfillSupport;
He?.(Ne, Fe), (fe.litHtmlVersions ??= []).push("3.3.3");
var Ue = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new Fe(t.insertBefore(ye(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, We = globalThis, w = class extends de {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Ue(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return b;
	}
};
w._$litElement$ = !0, w.finalized = !0, We.litElementHydrateSupport?.({ LitElement: w });
var Ge = We.litElementPolyfillSupport;
Ge?.({ LitElement: w }), (We.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region node_modules/@lit/reactive-element/decorators/property.js
var Ke = {
	attribute: !0,
	type: String,
	converter: ce,
	reflect: !1,
	hasChanged: le
}, qe = (e = Ke, t, n) => {
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
function T(e) {
	return (t, n) => typeof n == "object" ? qe(e, t, n) : ((e, t, n) => {
		let r = t.hasOwnProperty(n);
		return t.constructor.createProperty(n, e), r ? Object.getOwnPropertyDescriptor(t, n) : void 0;
	})(e, t, n);
}
//#endregion
//#region node_modules/@lit/reactive-element/decorators/state.js
function E(e) {
	return T({
		...e,
		state: !0,
		attribute: !1
	});
}
//#endregion
//#region src/velair/constants.ts
var D = [
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
	"sunday"
], Je = [
	"heat",
	"cool",
	"heat_cool",
	"auto",
	"dry",
	"fan_only",
	"off"
], Ye = "set_temperature", Xe = "turn_off", Ze = "velair", Qe = 5e3, $e = 5e3, et = [
	"overview",
	"profiles",
	"schedules",
	"templates",
	"sensors",
	"comfort",
	"preconditioning",
	"settings"
], tt = [
	"overview-status",
	"overview-boosts",
	"overview-events",
	"overview-timeline",
	"overview-zones",
	"active-setup",
	"schedules",
	"sensors",
	"comfort",
	"preconditioning"
], nt = [
	"zones",
	"templates",
	"settings",
	"preconditioning_learning",
	"profiles",
	"modes"
], rt = /* @__PURE__ */ t({ de: () => it }), it = {
	addBlock: "Block hinzufügen",
	apply: "Anwenden",
	cloneDayToDays: "Tag kopieren nach",
	cloneDayToThermostats: "Tag kopieren nach",
	cloneAction: "Kopieren",
	appliedDays: "Auf {count} Tag{suffix} kopiert",
	appliedTemplateTargets: "Auf {count} Ziele angewendet",
	appliedThermostats: "Auf {count} Thermostat{suffix} kopiert",
	applying: "Wird angewendet",
	applyTemplate: "Vorlage anwenden",
	applyTo: "Anwenden auf",
	applyToAction: "Anwenden auf...",
	applyTemplateTo: "{template} anwenden auf...",
	boost: "Boost",
	boostActive: "Boost aktiv",
	activeBoosts: "Aktive Boosts",
	availableModes: "Verfügbare Modi",
	boostTarget: "Boost-Ziel",
	boostUntil: "Endet in",
	blocks: "Blöcke",
	build: "Build",
	cardView: "Kartenansicht",
	activeSetupCardControls: "Steuerelemente für aktive Konfiguration",
	activeSetupCardControlsBoth: "Modi und Profile",
	activeSetupCardControlsDescription: "Wähle, was diese Karte ändern kann. Der aktuelle Modus und die angewendeten Profile bleiben sichtbar.",
	activeSetupCardControlsModes: "Nur Modi",
	activeSetupCardControlsProfiles: "Nur Profile",
	cardViewOverviewBoosts: "Übersicht: aktive Boosts",
	cardViewOverviewEvents: "Übersicht: nächste Ereignisse",
	cardViewOverviewStatus: "Übersicht: Zeitplanstatus",
	cardViewOverviewTimeline: "Übersicht: heutiger Zeitplan",
	cardViewOverviewZones: "Übersicht: Zonen",
	cardViewActiveSetup: "Profile: aktive Konfiguration",
	cardViewSchedules: "Zeitpläne: Editor",
	cardViewSensors: "Raumassistent: Konfiguration und Status",
	cardViewComfort: "Komfort: Konfiguration und Status",
	cardViewPreconditioning: "Vorkonditionierung: Konfiguration und Status",
	cardThermostatHidden: "In dieser Karte ausgeblendet",
	cardThermostatVisible: "In dieser Karte angezeigt",
	cardThermostats: "Thermostate in dieser Karte",
	cardThermostatsDescription: "Wähle aus, welche Thermostate diese Karte zeigt, und lege ihre Reihenfolge fest.",
	comfortCardVisibility: "Sichtbarkeit der Komfort-Karte",
	comfortCardVisibilityDescription: "Wähle, welche Komfort-Einstellungen und Live-Diagramme diese Karte zeigt.",
	comfortCardShowCo2: "CO2-Diagramm anzeigen",
	comfortCardShowConfiguration: "Konfiguration anzeigen",
	comfortCardShowHumidity: "Luftfeuchtigkeitsdiagramm anzeigen",
	comfortCardShowTemperature: "Temperaturdiagramm anzeigen",
	roomAssistCardVisibility: "Sichtbarkeit des Raumassistenten",
	roomAssistCardVisibilityDescription: "Wähle, welche Bedienelemente und Statusdetails des Raumassistenten diese Karte zeigt.",
	roomAssistShowDebounce: "Aktualisierungsverzögerung anzeigen",
	roomAssistShowLiveStatus: "Live-Status anzeigen",
	roomAssistShowMaxDelta: "Maximale Assistenzabweichung anzeigen",
	roomAssistShowSensor: "Raumtemperatursensor anzeigen",
	roomAssistShowSwitch: "Ein-/Ausschalter anzeigen",
	current: "Aktuell",
	currentHumidity: "Luftfeuchtigkeit",
	currentTemperature: "Aktuelle Temperatur",
	currentTime: "Aktuelle Uhrzeit: {time}",
	clear: "Leeren",
	confirmDeleteTemplate: "Vorlage {template} löschen?",
	confirmTemplate: "{weekday} durch {template} ersetzen?",
	comfort: "Komfort",
	comfortAirQuality: "Luftqualität",
	comfortAirQualityElevated: "CO2 erhöht",
	comfortAirQualityGood: "Gute Luft",
	comfortAirQualityPoor: "Schlechte Luftqualität",
	comfortAirQualityUnavailable: "CO2 nicht verfügbar",
	comfortAutomaticSourceValue: "Automatisch: {entity}",
	comfortCo2: "CO2",
	comfortCo2Attention: "Erhöht",
	comfortCo2Limits: "CO2-Grenzwerte",
	comfortCo2LimitsHelp: "„Erhöht“ kennzeichnet eine frühe Luftqualitätswarnung. „Schlecht“ kennzeichnet einen bedenklicheren CO2-Wert.",
	comfortCo2Poor: "Schlecht",
	comfortCo2Sensor: "CO2-Sensor",
	comfortCollapseClimate: "{climate} einklappen",
	comfortConditionCold: "Kalt",
	comfortConditionColdAndDry: "Kalt und trocken",
	comfortConditionColdAndHumid: "Kalt und feucht",
	comfortConditionComfortable: "Angenehm",
	comfortConditionDry: "Trockene Luft",
	comfortConditionHot: "Heiß",
	comfortConditionHotAndDry: "Heiß und trocken",
	comfortConditionHotAndHumid: "Heiß und feucht",
	comfortConditionHumid: "Feucht",
	comfortConditionHumidityComfortable: "Luftfeuchtigkeit im Zielbereich",
	comfortConditionMonitoringOff: "Überwachung aus",
	comfortConditionNoReadings: "Keine Messwerte",
	comfortConditionReadingsOutdated: "Messwerte veraltet",
	comfortConditionTemperatureComfortable: "Temperatur im Zielbereich",
	comfortCooler: "Kühler",
	comfortCurrentReadings: "Aktuelle Messwerte",
	comfortDataFreshness: "Datenaktualität",
	comfortDataIssueCo2Missing: "CO2 nicht verfügbar",
	comfortDataIssueCo2Stale: "CO2-Messwert veraltet",
	comfortDataIssueHumidityMissing: "Luftfeuchtigkeit nicht verfügbar",
	comfortDataIssueHumidityStale: "Luftfeuchtigkeitswert veraltet",
	comfortDataIssueTemperatureMissing: "Temperatur nicht verfügbar",
	comfortDataIssueTemperatureStale: "Temperaturmesswert veraltet",
	comfortDataPartial: "Unvollständige Messwerte",
	comfortDataStale: "Messwerte veraltet",
	comfortDataUnavailable: "Keine nutzbaren Messwerte",
	comfortDisabledDetail: "Die Komfortüberwachung ist für dieses Klimagerät ausgeschaltet. Es werden keine Komfortsensoren erfasst.",
	comfortDoNotMonitor: "CO2 nicht überwachen",
	comfortDoNotMonitorHumidity: "Luftfeuchtigkeit nicht überwachen",
	comfortDrier: "Trockener",
	comfortExpandClimate: "{climate} ausklappen",
	comfortHumidity: "Luftfeuchtigkeit",
	comfortHumidityRange: "Luftfeuchtigkeitsbereich",
	comfortHumidityRangeHelp: "Engere Bereiche warnen früher, weitere Bereiche sind toleranter.",
	comfortHumiditySensor: "Luftfeuchtigkeitssensor",
	comfortIntroDetail: "Überwache Temperatur, Luftfeuchtigkeit und CO2 lokal und nutze anschließend Velair-Ereignisse in Home-Assistant-Automatisierungen.",
	comfortIntroTitle: "Raumkomfort",
	comfortMaximum: "Max.",
	comfortMinimum: "Min.",
	comfortMoreHumid: "Feuchter",
	comfortMapCurrentPosition: "Aktuelle Position: {temperature}, {humidity}",
	comfortNotMonitored: "Nicht überwacht",
	comfortSelectSensor: "Automatische Quelle verwenden",
	comfortStaleAfter: "Veraltet nach",
	comfortStaleAfterHelp: "Maximales Alter seit der letzten Statusaktualisierung in Home Assistant. Höhere Werte akzeptieren ältere Daten länger, niedrigere markieren Sensoren früher als veraltet.",
	comfortTargetZone: "Komfortbereich",
	comfortTemperature: "Temperatur",
	comfortTemperatureRange: "Temperaturbereich",
	comfortTemperatureRangeHelp: "Engere Bereiche warnen früher, weitere Bereiche sind toleranter.",
	comfortTemperatureSensor: "Temperatursensor",
	comfortUnavailable: "Klimagerät nicht verfügbar",
	comfortWarmer: "Wärmer",
	createTemplate: "Vorlage erstellen",
	customTemplateName: "Vorlagenname",
	day: "Tag",
	daySchedule: "Tageszeitplan",
	defaultZone: "Erste verwaltete Zone",
	deleteBlock: "Block löschen",
	deleteTemplate: "Vorlage löschen",
	dismiss: "Schließen",
	duplicateStart: "Doppelte Startzeit: {start}",
	entityDiagnosticMissing: "Entität nicht gefunden",
	entityDiagnosticNoModes: "Keine unterstützten HVAC-Modi gemeldet",
	entityDiagnosticNoRange: "Kein Temperaturbereich gemeldet",
	entityDiagnosticNotClimate: "Entität ist kein Klimagerät",
	entityDiagnosticOk: "Die Thermostatkonfiguration ist in Ordnung",
	fanMode: "Lüftermodus",
	horizontalSwingMode: "Horizontale Schwenkbewegung",
	invalidStart: "Ungültige Startzeit: {start}",
	invalidTemperature: "Ungültige Temperatur für {start}",
	invalidTemperatureRange: "Verwende {min} bis {max}",
	invalidTemperatureStep: "Verwende Schritte von {step}",
	incompatibleScheduleTargets: "Einige Zeitplanziele müssen überprüft werden",
	incompatibleScheduleTargetsDescription: "{count} gespeicherte Ziele entsprechen nicht mehr dem Temperaturbereich oder der Temperaturschrittweite des Thermostats. Öffne „Zeitpläne“ und speichere einen unterstützten Wert.",
	operationRecoveryRequired: "Velair hat die Daten gespeichert, konnte den Betrieb aber nicht fortsetzen",
	operationRecoveryDescription: "Die Zeitplanung bleibt angehalten. Lade die Velair-Integration neu oder starte Home Assistant neu, um die Wiederherstellung abzuschließen.",
	operationCancelled: "Der Vorgang wurde abgebrochen",
	operationCurrentZone: "{zone} wird bearbeitet",
	operationDefaultCompleted: "Standardzeitpläne wiederhergestellt",
	operationDefaultFailed: "Standardzeitpläne konnten nicht wiederhergestellt werden",
	operationDefaultPartial: "Standardzeitpläne mit Problemen wiederhergestellt",
	operationDefaultRunning: "Standardzeitpläne werden wiederhergestellt",
	operationDismiss: "Vorgangsstatus schließen",
	operationFailedHelp: "Prüfe das betroffene Klimagerät und die Home-Assistant-Protokolle auf weitere Details",
	operationFailureCount: "{count} Zonen mit Problemen: {zones}",
	operationFailureOne: "1 Zone mit Problemen: {zones}",
	operationModeCompleted: "Modus {target} angewendet",
	operationModeFailed: "Modus {target} konnte nicht angewendet werden",
	operationModePartial: "Modus {target} mit Problemen angewendet",
	operationModeRunning: "Modus {target} wird angewendet",
	operationNoZones: "Für keine Zone waren Änderungen nötig",
	operationProfileCompleted: "Profil {target} angewendet",
	operationProfileFailed: "Profil {target} konnte nicht angewendet werden",
	operationProfilePartial: "Profil {target} mit Problemen angewendet",
	operationProfileRunning: "Profil {target} wird angewendet",
	operationProgress: "{completed} von {total} Zonen verarbeitet",
	operationProgressLabel: "Fortschritt des Velair-Vorgangs",
	keep: "Beibehalten",
	keepMode: "Modus beibehalten",
	tagline: "Klimaautomatisierung, die sich deinem Leben anpasst.",
	loading: "Zeitplandaten werden geladen...",
	loadingEntities: "Verwaltete Zonen werden geladen...",
	managedEntityAvailable: "Verfügbar",
	managedEntityMissing: "Nicht gefunden",
	managedEntitiesStatus: "Verwaltete Thermostate",
	menu: "Menü",
	minutesShort: "Min.",
	secondsShort: "s",
	providedData: "Bereitgestellte Daten",
	profiles: "Profile",
	profilesAndModes: "Profile und Modi",
	activeSetup: "Aktive Konfiguration",
	activeSetupDescription: "Sieh, was deine Zonen aktuell steuert, und ändere es zentral.",
	activeSetupChange: "Ändern",
	activeSetupModesHelp: "Wähle den Modus, der die aktiven Profile steuern soll.",
	activeSetupAppliedProfiles: "Angewendete Profile",
	activeSetupNoProfiles: "Keine Profile angewendet. Die Zonen folgen ihren Standardzeitplänen.",
	activeSetupManualProfile: "Profil manuell aktivieren",
	activeSetupManualProfileHelp: "Dies ersetzt alle aktiven Profile und wechselt in den manuellen Modus. Verwende einen Modus, um mehrere Profile gleichzeitig zu aktivieren.",
	profilesPanelIntro: "Profile definieren alternative Klimaroutinen. Modi aktivieren ein oder mehrere Profile gemeinsam.",
	profileLibrarySelectorLabel: "Profil- und Modusbibliotheken",
	profilesLibraryDescription: "Lege fest, wie sich ausgewählte Zonen verhalten sollen.",
	profilesDescription: "Ein Profil legt fest, wie sich eine oder mehrere Zonen verhalten, solange es aktiv ist.",
	profileActive: "Aktives Profil",
	profilesActive: "Aktive Profile",
	profileActivate: "Profil aktivieren",
	profileBehaviorDefault: "Standardzeitplan",
	profileBehaviorPause: "Zeitplan pausieren",
	profileBehaviorSchedule: "Profilzeitplan",
	profileBlockAction: "Aktion",
	profileBrowseIcons: "Verfügbare Symbole durchsuchen",
	profileConfirmDelete: "{profile} und alle zugehörigen Zoneneinstellungen löschen? Dies kann nicht rückgängig gemacht werden.",
	profileConfirmDeleteActive: "{profile} ist aktiv. Löschen und die zugehörigen Zonen auf Standard zurücksetzen? Andere aktive Profile bleiben bestehen. Dies kann nicht rückgängig gemacht werden.",
	profileColor: "Profilfarbe",
	profileColorHelp: "Dient zur Kennzeichnung dieses Profils in Auswahllisten und Übersichten.",
	profileCopyTemplate: "Vorlage auf diesen Tag kopieren",
	profileCreate: "Neues Profil",
	profileDelete: "Profil löschen",
	profileDeleted: "Profil gelöscht",
	profileDescription: "Beschreibung",
	profileDescriptionCharactersRemaining: "Noch {count} Zeichen",
	profileDescriptionTooLong: "Die Beschreibung darf höchstens {count} Zeichen lang sein.",
	profileDiscardChanges: "Ungespeicherte Profiländerungen verwerfen?",
	profileCollapseClimate: "{climate} einklappen",
	profileExpandClimate: "{climate} ausklappen",
	profileIcon: "Symbol",
	profileIconHelp: "Verwende einen Material-Design-Icons-Schlüssel, zum Beispiel mdi:briefcase-outline.",
	profileActiveContext: "Aktiver Klimakontext",
	modeBuiltInHelp: "Integrierte Modi können weder umbenannt noch gelöscht werden.",
	modeInformation: "Über {mode}",
	modeChooseProfile: "Profil auswählen",
	modeConfirmDelete: "Modus {mode} löschen? Dies kann nicht rückgängig gemacht werden.",
	modeCreate: "Neuer Modus",
	modeDelete: "Modus löschen",
	modeDeleted: "Modus gelöscht",
	modeDiscardChanges: "Ungespeicherte Modusänderungen verwerfen?",
	modeDefault: "Standard",
	modeDefaultDescription: "Deaktiviert Profile und stellt den Standardzeitplan jeder Zone wieder her.",
	modeManual: "Manuell",
	modeManualDescription: "Aktive Profile werden von keinem Modus gesteuert.",
	modeCustomDescription: "Aktiviert die zugeordneten Profile: {profile}.",
	modeChange: "Modus ändern",
	modeLabel: "Modus",
	modeMappedProfile: "Zugeordnetes Profil: {profile}",
	modeMappedProfileMissing: "Zugeordnetes Profil nicht verfügbar: {profile}",
	modeMappedProfiles: "Zugeordnete Profile: {profiles}",
	modeName: "Modusname",
	modeNameDuplicate: "Verwende einen eindeutigen Modusnamen.",
	modeNameHelp: "Dieser Wert erscheint in der Modusauswahl von Home Assistant.",
	modeNameRequired: "Ein Modusname ist erforderlich.",
	modeNameTooLong: "Der Modusname darf höchstens {count} Zeichen lang sein.",
	modeProfile: "Zugeordnetes Profil",
	modeProfiles: "Zugeordnete Profile",
	modeProfileHelp: "Wenn du diesen Modus auswählst, werden alle ausgewählten Profile aktiviert. Eine Zone darf nur zu einem davon gehören.",
	modeProfileRequired: "Wähle mindestens ein Profil aus und vermeide Profile, die dieselbe Zone konfigurieren.",
	modeSaved: "Modus gespeichert",
	modeSelectToBegin: "Wähle einen benutzerdefinierten Modus zum Bearbeiten aus oder erstelle einen neuen",
	modeUnableDelete: "Der Modus konnte nicht gelöscht werden",
	modeUnableActivate: "Der Modus konnte nicht geändert werden",
	modeUnableSave: "Der Modus konnte nicht gespeichert werden",
	modesDescription: "Ein Modus aktiviert ein oder mehrere Profile gemeinsam über Velair oder Home Assistant.",
	modesLibraryDescription: "Aktiviere ein oder mehrere Profile gemeinsam.",
	modesEntityNote: "Automatisierungen können über select.velair_mode einen Modus auswählen oder mit velair.activate_profile und der Automatisierungs-ID ein Profil aktivieren.",
	modesTitle: "Modi",
	profilesActiveCount: "{count} aktive Profile",
	profileId: "Automatisierungs-ID",
	profileIdReadonlyHelp: "Stabile schreibgeschützte ID für Automatisierungen und Dienste.",
	profileInvalidIcon: "Verwende einen gültigen Schlüssel im Format mdi:icon-name.",
	profileInvalidColor: "Wähle eine gültige Farbe im Format #RRGGBB.",
	profileInvalidSchedule: "Prüfe, ob jeder Block eine gültige, eindeutige Uhrzeit und Temperatur hat.",
	profileName: "Profilname",
	profileNameRequired: "Ein Profilname ist erforderlich",
	profileNewName: "Neues Profil",
	profileNoDescription: "Keine Beschreibung",
	profileNoneCreated: "Keine Profile",
	profileDefaultDescription: "Jede Zone verwendet ihren Standardzeitplan.",
	profileOverviewLabel: "Profil",
	profilePauseAction: "Während der Pause",
	profilePauseKeep: "Klimagerät unverändert lassen",
	profilePauseTurnOff: "Klimagerät ausschalten",
	profileRemovedElsewhere: "Dieses Profil wurde an anderer Stelle entfernt. Wähle ein anderes Profil aus oder erstelle ein neues.",
	profileSaved: "Profil gespeichert",
	profileSelectToBegin: "Wähle ein Profil zum Bearbeiten aus",
	profileUnableActivate: "Profil konnte nicht aktiviert werden",
	profileUnableDelete: "Profil konnte nicht gelöscht werden",
	profileZoneBehavior: "Zonenverhalten",
	portability: "Datenübertragung",
	portabilityDescription: "Exportiere oder importiere Velair-Daten über eine versionierte JSON-Datei.",
	portabilityFileReady: "{file} ist bereit",
	portabilityIncluded: "Enthalten",
	portabilitySettingsSection: "Einstellungen",
	portabilityTemplatesSection: "Vorlagen",
	portabilityZonesSection: "Thermostatzeitpläne",
	portabilityPreconditioningLearningSection: "Lerndaten der Vorkonditionierung",
	portabilityProfilesSection: "Klimaprofile",
	portabilityModesSection: "Modi",
	preconditioningImportSkipped: "Lerndaten der Vorkonditionierung übersprungen ({count}). Diese Thermostate werden hier nicht verwaltet: {entities}",
	portableExported: "Exportdatei erstellt",
	portableImported: "Import abgeschlossen",
	importData: "Importieren",
	importFile: "Importdatei",
	chooseFile: "Datei auswählen",
	climateOptions: "Klimaoptionen",
	climateOptionsAdd: "Optionale Einstellungen hinzufügen",
	noFileSelected: "Keine Datei ausgewählt",
	exportData: "Exportieren",
	invalidImportFile: "Dies ist keine gültige Velair-Exportdatei",
	importOverwriteWarning: "Beim Import werden vorhandene Werte überschrieben. Ohne vorherigen Export können sie nicht wiederhergestellt werden.",
	noImportSections: "Keine importierbaren Bereiche gefunden",
	legacyImportTemperatureUnit: "Diese ältere Sicherung enthält keine Temperatureinheit. Velair behandelt ihre Temperaturen als Celsius und wandelt sie bei Bedarf in {target} um.",
	notSet: "Nicht festgelegt",
	maintenance: "Wartung",
	maintenanceDescription: "Technische Versionsdetails zur Fehlerbehebung.",
	frontendBuild: "Frontend-Build",
	portableFormatVersion: "Übertragungs-/Exportformat",
	internalStorageVersion: "Speicher/Datenmodell",
	integrationVersion: "Integrationsversion",
	resetVelair: "Velair zurücksetzen",
	resetVelairDescription: "Löscht alle gespeicherten Velair-Daten, einschließlich Zeitplänen, Vorlagen, Panel-Einstellungen, aktiven Boosts und Pausen, Komfort- und Raumassistent-Einstellungen, Einstellungen und Lerndaten der adaptiven Vorkonditionierung sowie des Startverhaltens. Anschließend werden einheitenabhängige Standardwerte für die derzeit verwalteten Thermostate neu erstellt.",
	confirmReset: "Alle gespeicherten Velair-Daten zurücksetzen? Ohne vorherigen Export kann dies nicht rückgängig gemacht werden.",
	confirmResetPreconditioningLearning: "Adaptive Lerndaten der Vorkonditionierung für {direction} zurücksetzen? Zeitpläne und Einstellungen bleiben erhalten.",
	confirmResetPreconditioningSettings: "Standardeinstellungen der Vorkonditionierung für dieses Thermostat wiederherstellen? Lerndaten bleiben erhalten.",
	resetDone: "Velair-Daten zurückgesetzt",
	resetting: "Wird zurückgesetzt",
	minTemperature: "Mindesttemperatur",
	maxTemperature: "Höchsttemperatur",
	modeOptional: "Modus optional",
	firstWeekday: "Erster Wochentag",
	managedZones: "Verwaltete Zonen",
	mode: "Modus",
	moveDown: "Nach unten",
	moveUp: "Nach oben",
	nextEvent: "Nächstes Ereignis",
	nextEvents: "Nächste Ereignisse",
	noActiveBoosts: "Keine aktiven Boosts",
	noBlocks: "Keine Blöcke",
	noManagedEntities: "Keine verwalteten Klimageräte gefunden.",
	noTemplates: "Keine Vorlagen",
	newTemplate: "Neue Vorlage",
	noUpcomingEvent: "Kein bevorstehendes Ereignis",
	off: "Aus",
	otherDays: "Andere Tage",
	otherThermostats: "Andere Thermostate",
	overview: "Übersicht",
	overviewPanelIntro: "Die Hauptstatusansicht gruppiert Zeitplanstatus, bevorstehende Ereignisse, aktive Boosts und Schnellaktionen.",
	overviewStatusPaused: "Pausiert",
	overviewStatusPausedDetail: "Vorübergehend pausiert",
	overviewStatusRunning: "Aktiv",
	overviewStatusRunningDetail: "Zeitpläne werden angewendet",
	overviewStatusStopped: "Gestoppt",
	overviewStatusStoppedDetail: "Die Zeitplanung ist bis zur Fortsetzung gestoppt",
	overviewZones: "Zonenübersicht",
	overviewZoneApplied: "Angewendet",
	overviewZoneAir: "Luft: {status}",
	overviewZoneBoost: "Boost",
	overviewZoneComfort: "Komfort: {status}",
	overviewZoneManual: "Manuell",
	overviewZonePaused: "Pausiert",
	overviewZonePreconditioning: "Vorkonditionierung",
	overviewZoneResumes: "Fortsetzung um {time}",
	overviewZoneRoom: "Raum",
	overviewZoneRoomAssist: "Raumassistent {delta}",
	overviewZoneScheduled: "Geplant",
	overviewZoneSensorIssue: "Sensordaten unvollständig",
	overviewZoneTarget: "Ziel",
	overviewZoneUntil: "Bis {time}",
	overviewZoneUntilResumed: "Bis zur Fortsetzung",
	overviewZoneReadyAt: "Bereit um {time}",
	overviewZoneNextAt: "Nächstes um {time}",
	overviewZoneAutomationOff: "Automatisierung aus",
	overviewZoneRoomAssistThermalFlow: "Temperaturverlauf des Raumassistenten",
	overviewZoneSensor: "Sensor",
	overviewZoneClimate: "Klimagerät",
	overviewZoneTemperature: "Temperatur",
	overviewZoneSetpoint: "Sollwert",
	overviewZoneScheduledSetpoint: "Geplant",
	overviewZoneOffset: "Abweichung",
	overviewZoneRoomAssistActive: "Aktiv",
	overviewZoneRoomAssistHolding: "Hält",
	overviewZoneComfortLabel: "Komfort",
	overviewZoneAirLabel: "Luft",
	overviewZoneDataLabel: "Daten",
	pause: "Pausieren",
	pauseActive: "Pausiert",
	pauseApplied: "Zeitplanung pausiert",
	pauseDuration: "Pausendauer (Min.)",
	pauseFrom: "Von",
	pauseIndefinite: "Keine Endzeit",
	pauseRemaining: "Fortsetzung in",
	pauseTo: "Bis",
	preconditioning: "Vorkonditionierung",
	preconditioningEnabled: "Vorkonditionierung aktiviert",
	preconditioningCool: "Kühlen",
	preconditioningCoolingFallbackLead: "Kühlungs-Ersatzwert (Min.)",
	preconditioningDirectionSamples: "{count}/{required}",
	preconditioningHeat: "Heizen",
	preconditioningHeatingFallbackLead: "Heizungs-Ersatzwert (Min.)",
	preconditioningDirectionStatus: "Status",
	preconditioningExpandClimate: "{climate} ausklappen",
	preconditioningIntroDetail: "Lass Velair berechnen, wann ein geplanter Komfortsollwert beginnen soll, damit der Raum rechtzeitig näher an der Zieltemperatur ist.",
	preconditioningIntroTitle: "Adaptive Komfortzeitplanung",
	preconditioningAdaptivePercentile: "Dynamisches Komfortperzentil",
	preconditioningAdaptivePercentileHelp: "Ein erhöht die Reserve nach zu vielen unvollständigen Versuchen und verringert sie nach dauerhaft vollständigen Versuchen.",
	preconditioningCalculationCombined: "Kombiniert",
	preconditioningCalculationDetails: "Berechnungsdetails",
	preconditioningCalculationFinalLead: "Endgültiger Vorlauf",
	preconditioningCalculationPartialFloor: "Mindestwert für Teilversuche",
	preconditioningCalculationReachedEstimate: "Schätzung bei Zielerreichung",
	preconditioningCalculationRounded: "Gerundet",
	preconditioningCalculationSampleCounts: "Erreicht: {reached} · Teilweise: {partial} · Ungültig: {invalid}",
	preconditioningCalculationSamples: "Stichproben",
	preconditioningComfortPercentile: "Komfortperzentil",
	preconditioningComfortPercentileHelp: "Höher startet anhand langsamerer Lernfälle früher; niedriger startet später mit weniger Reserve.",
	preconditioningComfortPercentileLabel: "Komfortperzentil",
	preconditioningCollapseClimate: "{climate} einklappen",
	preconditioningFallbackInactive: "Adaptives Modell aktiv",
	preconditioningFallbackLabel: "Ersatzwert",
	preconditioningFallbackLead: "{minutes} Min.",
	preconditioningFallbackMinutesPerDegree: "Ausgangsmodell",
	preconditioningFallbackMinutesPerDegreeHelp: "Höher startet früher, solange noch nicht genug Lerndaten vorliegen; niedriger startet später.",
	preconditioningHistorySize: "Verlaufsgröße",
	preconditioningHistorySizeHelp: "Höher behält mehr nützliche Stichproben; niedriger vergisst ältere Stichproben früher.",
	preconditioningHistory: "Verlauf",
	preconditioningInvalidEvents: "Ungültig",
	preconditioningLastSample: "Letzte Stichprobe",
	preconditioningLeadTime: "{minutes} Min. früher",
	preconditioningLearning: "Lernt lokal",
	preconditioningLearningStatus: "Lernstatus",
	preconditioningLearningDisabled: "Lernen deaktiviert",
	preconditioningLearningMoreData: "Weitere Daten erforderlich",
	preconditioningLearningReady: "Lernmodell bereit",
	preconditioningLimitedByMax: "Durch Höchstwert begrenzt",
	preconditioningLivePrediction: "Live-Prognose",
	preconditioningLivePredictionHelp: "Verwendet den nächsten echten Block, um Änderungen am berechneten Start der Vorkonditionierung anzuzeigen.",
	preconditioningMaxLead: "Frühester Start (Min.)",
	preconditioningMaxLeadHelp: "Höher erlaubt frühere Starts; niedriger begrenzt den Vorlauf stärker.",
	preconditioningMaximumLabel: "Maximum",
	preconditioningMinimumDelta: "Mindesttemperaturdifferenz",
	preconditioningMinimumDeltaHelp: "Höher ignoriert größere kleine Abstände; niedriger reagiert auf kleinere Temperaturunterschiede.",
	preconditioningMinStart: "Mindestvorlauf (Min.)",
	preconditioningMinStartHelp: "Höher ignoriert kurze prognostizierte Vorläufe; niedriger erlaubt kleinere Frühstarts.",
	preconditioningModelHistory: "Ähnlicher Verlauf",
	preconditioningModel: "Lernmodell",
	preconditioningModelInitial: "Ausgangsmodell",
	preconditioningModelSource: "Modellquelle",
	preconditioningNextBlock: "Nächster Block",
	preconditioningNoUpcomingDirectionEvent: "Kein bevorstehender Block für {direction} zur Prognose.",
	preconditioningNormalStart: "Normaler Start",
	preconditioningNotSupported: "Nicht unterstützt",
	preconditioningPartialEvents: "Teilweise",
	preconditioningPartialSamples: "{count} teilweise",
	preconditioningPartialExpiry: "Ablauf von Teilversuchen (Tage)",
	preconditioningPartialExpiryHelp: "Höher lässt unvollständige Versuche Prognosen länger beeinflussen; niedriger lässt sie früher verfallen.",
	preconditioningQualityComplete: "Vollständig",
	preconditioningQualityInvalid: "Ungültig",
	preconditioningQualityPartial: "Teilweise",
	preconditioningRecencyDecay: "Aktualitätsabfall (Tage)",
	preconditioningRecencyDecayHelp: "Höher lässt alte Stichproben langsamer an Gewicht verlieren; niedriger bevorzugt neueres Verhalten.",
	preconditioningReachedEvents: "Erreicht",
	preconditioningResetLearning: "Lerndaten zurücksetzen",
	preconditioningLearningResetDone: "Lerndaten für {direction} zurückgesetzt",
	preconditioningSimilarSamples: "Ähnliche Stichproben",
	preconditioningSimilarSamplesHelp: "Höher berücksichtigt mehr nahe Verlaufsdaten; niedriger konzentriert sich auf die ähnlichsten Fälle.",
	preconditioningUnsupportedDirection: "Von diesem Thermostat nicht unterstützt",
	preconditioningOutdoorTemperatureEntity: "Außentemperatursensor",
	preconditioningOutdoorTemperatureEntityHelp: "Liefert lokalen Außenkontext zum Vergleich gelernter Stichproben; das Ausgangsmodell wird nicht verändert.",
	preconditioningOutdoorContext: "Außenkontext",
	preconditioningOutdoorDisabled: "Deaktiviert",
	preconditioningSelectOutdoorSensor: "Sensor auswählen",
	preconditioningResetSettings: "Standardeinstellungen wiederherstellen",
	preconditioningSettingsResetDone: "Vorkonditionierungseinstellungen wiederhergestellt",
	preconditioningStarts: "Startet",
	preconditioningTargetBy: "Ziel bis",
	preconditioningTiming: "Zeitplanung und Grenzwerte",
	preconditioningUnavailable: "Thermostat nicht verfügbar. Die Vorkonditionierung kann nicht aktiviert werden.",
	preconditioningUseOutdoorTemperature: "Außentemperatur verwenden",
	preconditioningUseOutdoorTemperatureHelp: "Ein bezieht die Außentemperatur bei der Auswahl ähnlicher gelernter Stichproben ein.",
	resume: "Fortsetzen",
	resumed: "Zeitplanung fortgesetzt",
	resizeEnd: "Ende anpassen",
	resizeStart: "Start anpassen",
	schedulerControls: "Zeitplansteuerung",
	schedules: "Zeitpläne",
	sensors: "Raumassistent",
	roomSensorAppliedTarget: "Angewendeter Sollwert",
	roomSensorAssist: "Raumsensor-Assistent",
	roomSensorAssistBadge: "Raumassistent",
	roomSensorAssistEnabled: "Raumsensor-Assistent aktiviert",
	roomSensorAssistHelp: "Passt den Sollwert des Klimageräts vorübergehend an, damit der Raumsensor die geplante Temperatur erreichen kann.",
	roomSensorAssistDisabledDetail: "Ein Raumsensor ist ausgewählt, aber der Raumsensor-Assistent ist aus. Velair verwendet weiterhin die Temperatur des Klimageräts, bis dieser Schalter aktiviert wird.",
	roomSensorAssistDebounce: "Aktualisierungsverzögerung",
	roomSensorAssistDebounceHelp: "Wartezeit in Sekunden nach Änderungen der Raum- oder Klimatemperatur, bevor der unterstützte Sollwert neu berechnet wird. Verwende 0 für sofortige Aktualisierungen.",
	roomSensorAssistMaxDelta: "Maximale Korrektur",
	roomSensorAssistMaxDeltaHelp: "Höher kann das Ventil länger offen halten; niedriger begrenzt, wie weit Velair den Klimasollwert anpassen kann.",
	roomSensorAssistOffset: "Assistenzabweichung",
	roomSensorAssistOffsetHelp: "Vorübergehende Abweichung vom Klimasollwert, damit sich der Raumsensor weiter der geplanten Temperatur annähern kann.",
	roomSensorAssistCorrectionValue: "Abweichung {value}",
	roomSensorAssistCorrectionActiveHelp: "Der Raumassistent passt den Klimasollwert an. Dies zeigt nicht an, ob das Klimagerät aktiv heizt oder kühlt.",
	roomSensorAssistNoCorrection: "Abweichung 0 · Hält",
	roomSensorAssistNoCorrectionHelp: "Der Raumassistent korrigiert den Sollwert nicht. Raum- und Zeitplantemperatur können dennoch voneinander abweichen.",
	roomSensorBlockActiveSince: "Aktiv seit {time}",
	roomSensorBlockMode: "Modus: {mode}",
	roomSensorBlockScheduled: "Geplant für {time}",
	roomSensorBlockStartedEarly: "Gestartet um {time}",
	roomSensorBlockTarget: "Ziel: {target}",
	roomSensorGapAboveTarget: "{value} über dem Ziel",
	roomSensorGapBelowTarget: "{value} unter dem Ziel",
	roomSensorClimateTarget: "Klimasollwert",
	roomSensorClimateTemperature: "Messwert des Klimageräts",
	roomSensorCollapseClimate: "{climate} einklappen",
	roomSensorControl: "Raumsensor-Assistent",
	roomSensorExpandClimate: "{climate} ausklappen",
	roomSensorIntroDetail: "Verwende einen Raumtemperatursensor, um den Klimasollwert zu steuern, während Velair verwaltete Temperaturblöcke ausführt.",
	roomSensorIntroTitle: "Raumtemperaturregelung",
	roomSensorLiveStatus: "Live-Status",
	roomSensorNoActiveBlock: "Kein aktiver Temperaturblock",
	roomSensorNoActiveBlockDetail: "Der Raumassistent wird aktualisiert, sobald ein verwalteter Temperaturblock aktiv ist.",
	roomSensorNotConfigured: "Wähle zuerst einen Raumsensor aus",
	roomSensorRoomTemperature: "Raumsensor",
	roomSensorRemainingToTarget: "Bis zum Ziel",
	roomSensorRemainingValue: "Noch {value}",
	roomSensorScheduledTarget: "Geplanter Sollwert",
	roomSensorSelectSensor: "Raumsensor auswählen",
	roomSensorStatusAssisting: "Unterstützt",
	roomSensorStatusBlocked: "Blockiert",
	roomSensorStatusDisabled: "Deaktiviert",
	roomSensorStatusHolding: "Hält",
	roomSensorStatusIdle: "Inaktiv",
	roomSensorStatusNotConfigured: "Nicht konfiguriert",
	roomSensorStatusReady: "Bereit",
	roomSensorStatusUnavailable: "Nicht verfügbar",
	roomSensorTemperatureEntity: "Raumtemperatursensor",
	roomSensorTemperatureEntityHelp: "Sensor, den der Raumsensor-Assistent beim Anpassen des Klimasollwerts als tatsächliche Raumtemperatur verwendet.",
	roomSensorTemperatureScale: "Temperaturskala des Raumassistenten",
	roomSensorUnavailable: "Klimagerät nicht verfügbar",
	roomSensorValueUnavailable: "Nicht verfügbar",
	save: "Speichern",
	saveTemplate: "Als Vorlage speichern",
	saved: "Zeitplan gespeichert",
	saving: "Wird gespeichert",
	scheduleCopyHint: "Du kannst diese Konfiguration auch auf einen anderen Tag oder ein anderes Klimagerät kopieren.",
	scheduleEditor: "Zeitplaneditor",
	scheduleStepClimate: "1. Wähle das Klimagerät aus, das du konfigurieren möchtest.",
	scheduleStepConfigure: "3. Konfiguriere das Klimagerät nach deinen Wünschen.",
	scheduleStepDay: "2. Wähle den Tag aus, den du konfigurieren möchtest.",
	reorderZones: "Ziehe Thermostate, um ihre Reihenfolge im Panel zu ändern.",
	selectedWeekday: "Anfangstag",
	selectedZone: "Anfangszone",
	selectTemplatePlaceholder: "Vorlage auswählen",
	selectTemplateToBegin: "Wähle zunächst eine Vorlage aus.",
	setTemperature: "Temperatur festlegen",
	settings: "Einstellungen",
	settingsPanelIntro: "Wähle, wie Thermostate und Wochentage in diesem Panel angeordnet werden.",
	startupBehavior: "Start von Home Assistant",
	startsAt: "Beginnt",
	applyScheduleOnStartup: "Aktiven Zeitplan nach dem Start anwenden",
	applyScheduleOnStartupDescription: "Beim Start von Home Assistant kann Velair den aktuellen Zeitplanblock auf die verwalteten Thermostate anwenden, statt sie unverändert zu lassen.",
	start: "Start",
	status: "Status",
	stop: "Stopp",
	supportedFanModes: "Lüftermodi",
	supportedHorizontalSwingModes: "Horizontale Schwenkmodi",
	supportedPresetModes: "Voreinstellungen",
	supportedSwingModes: "Schwenkmodi",
	presetMode: "Voreinstellung",
	swingMode: "Schwenkmodus",
	temp: "Temp.",
	temperatureRange: "Temperaturbereich",
	temperatureUnit: "Temperatureinheit",
	temperatureUnitManagedByHomeAssistant: "Von Home Assistant erkannt. Ändere diesen Wert in den Einheitensystem-Einstellungen von Home Assistant.",
	temperatureMigrationRequired: "Velair benötigt deine Aufmerksamkeit",
	temperatureMigrationStopped: "Zeitplanung und Temperaturkonfiguration sind gesperrt, weil Home Assistant die Temperatureinheit geändert hat. Öffne die Velair-Einstellungen, um die Daten sicher zu migrieren.",
	temperatureMigrationQuestion: "Gespeicherte Temperaturen von {source} nach {target} migrieren?",
	temperatureMigrationExplanation: "Fahre nur fort, wenn alle gespeicherten Velair-Temperaturen noch in {source} vorliegen. Diese Migration aktualisiert Zeitpläne, Vorlagen, Überschreibungen, Komfort, Raumassistent, Vorkonditionierungseinstellungen, Raten und Lerndaten, bevor die Zeitplanung fortgesetzt wird. Falls ein gespeicherter Wert bereits in {target} vorliegt, wird er durch die Migration falsch.",
	temperatureMigrationUse: "{source} nach {target} migrieren",
	temperatureMigrationConfirm: "Bestätigen, dass alle gespeicherten Velair-Temperaturdaten in {source} vorliegen, und in {target} umwandeln? Fahre nicht fort, falls ein gespeicherter Wert bereits in {target} vorliegt, da er sonst falsch wird. Die Zeitplanung bleibt gestoppt, wenn die Migration nicht gespeichert werden kann.",
	temperatureMigrationComplete: "Temperaturdaten aktualisiert und Zeitplanung fortgesetzt",
	temperatureMigrationFailed: "Temperaturdaten konnten nicht aktualisiert werden",
	temperatureLegacyResetQuestion: "Veraltete Celsius-Daten für {target} zurücksetzen?",
	temperatureLegacyResetExplanation: "Diese Installation wurde mit einer Velair-Version erstellt, die nur Celsius-Werte gespeichert hat. Da Home Assistant jetzt {target} verwendet, setze Velair zurück, um die alten Daten zu verwerfen und sichere einheitenabhängige Standardwerte zu erstellen. Bei künftigen Änderungen der Home-Assistant-Einheit wird stattdessen eine vollständige Datenkonvertierung angeboten.",
	temperatureLegacyResetStopped: "Die Zeitplanung ist gestoppt, weil diese ältere Installation nur Celsius-Daten enthält, während Home Assistant Fahrenheit verwendet. Öffne die Velair-Einstellungen und verwende „Velair zurücksetzen“, um Fahrenheit-Standardwerte zu erstellen.",
	temperatureStep: "Schrittweite",
	temperatureStepNotReported: "Von Home Assistant nicht gemeldet",
	temperatureStepNotReportedDescription: "Dieses Klimagerät veröffentlicht target_temp_step nicht. Velair leitet keine Temperaturschrittweite ab.",
	targetTemp: "Zieltemperatur",
	targetHumidity: "Zielluftfeuchtigkeit",
	targetBy: "Ziel bis",
	targetTemperature: "Zieltemperatur",
	todayTimeline: "Heutiger Zeitplan",
	updateTemplate: "Vorlage aktualisieren",
	templateDeleted: "Vorlage gelöscht",
	templateNameRequired: "Ein Vorlagenname ist erforderlich",
	templateOptionalHint: "Wähle eine Vorlage aus oder konfiguriere den Zeitplan manuell.",
	templateSaved: "Vorlage gespeichert",
	templates: "Vorlagen",
	thermostat: "Thermostat",
	templatesPanelIntro: "Die Vorlagenbearbeitung wird hierher verschoben, damit die Zeitplanbearbeitung übersichtlich bleibt.",
	time: "Zeit",
	timeline: "Zeitplan",
	title: "Titel",
	unableApplyThermostats: "Zeitplan konnte nicht auf Thermostate angewendet werden",
	unableCopy: "Zeitplan konnte nicht kopiert werden",
	unableLoad: "Zeitplandaten konnten nicht geladen werden",
	unablePause: "Zeitplanung konnte nicht pausiert werden",
	unableResume: "Zeitplanung konnte nicht fortgesetzt werden",
	unableReset: "Velair-Daten konnten nicht zurückgesetzt werden",
	unableSave: "Zeitplan konnte nicht gespeichert werden",
	unableSaveSettings: "Einstellungen konnten nicht gespeichert werden",
	unableDeleteTemplate: "Vorlage konnte nicht gelöscht werden",
	unableExport: "Daten konnten nicht exportiert werden",
	unableSaveTemplate: "Vorlage konnte nicht gespeichert werden",
	unableSubscribe: "Zeitplanaktualisierungen konnten nicht abonniert werden",
	unsupportedModeForClimate: "{entity} unterstützt {mode} um {start} nicht. Ändere diesen Block vor dem Anwenden auf „Beibehalten“ oder wähle einen unterstützten Modus.",
	unsaved: "ungespeichert",
	waiting: "Warte auf Zeitplandaten",
	zoneOrder: "Thermostatreihenfolge",
	zonesManaged: "{count} Zonen verwaltet",
	weekdays: {
		monday: "Montag",
		tuesday: "Dienstag",
		wednesday: "Mittwoch",
		thursday: "Donnerstag",
		friday: "Freitag",
		saturday: "Samstag",
		sunday: "Sonntag"
	},
	schedulerStatuses: {
		idle: "Inaktiv",
		override_active: "Boost aktiv",
		paused: "Pausiert",
		scheduled: "Geplant"
	},
	schedulerModes: {
		auto: "Auto",
		paused: "Pausiert"
	},
	hvacModes: {
		auto: "Auto",
		cool: "Kühlen",
		dry: "Entfeuchten",
		fan_only: "Nur Lüfter",
		heat: "Heizen",
		heat_cool: "Heizen/Kühlen",
		off: "Aus"
	},
	hvacActions: {
		cooling: "Kühlt",
		drying: "Entfeuchtet",
		fan: "Lüfter",
		heating: "Heizt",
		idle: "Inaktiv",
		off: "Aus",
		preheating: "Vorheizen",
		defrosting: "Abtauen"
	}
}, at = /* @__PURE__ */ t({ en: () => ot }), ot = {
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
	activeSetupCardControls: "Active setup controls",
	activeSetupCardControlsBoth: "Modes and Profiles",
	activeSetupCardControlsDescription: "Choose what this card can change. The current Mode and applied Profiles remain visible.",
	activeSetupCardControlsModes: "Modes only",
	activeSetupCardControlsProfiles: "Profiles only",
	cardViewOverviewBoosts: "Overview: active boosts",
	cardViewOverviewEvents: "Overview: next events",
	cardViewOverviewStatus: "Overview: scheduler status",
	cardViewOverviewTimeline: "Overview: today's timeline",
	cardViewOverviewZones: "Overview: zone overview",
	cardViewActiveSetup: "Profiles: active setup",
	cardViewSchedules: "Schedules: editor",
	cardViewSensors: "Room Assist: configuration and status",
	cardViewComfort: "Comfort: configuration and status",
	cardViewPreconditioning: "Preconditioning: configuration and status",
	cardThermostatHidden: "Hidden in this card",
	cardThermostatVisible: "Shown in this card",
	cardThermostats: "Thermostats in this card",
	cardThermostatsDescription: "Choose which thermostats this card shows and arrange their order.",
	comfortCardVisibility: "Comfort card visibility",
	comfortCardVisibilityDescription: "Choose which Comfort setup and live graphs this card shows.",
	comfortCardShowCo2: "Show CO2 graph",
	comfortCardShowConfiguration: "Show configuration",
	comfortCardShowHumidity: "Show humidity graph",
	comfortCardShowTemperature: "Show temperature graph",
	roomAssistCardVisibility: "Room Assist visibility",
	roomAssistCardVisibilityDescription: "Choose which Room Assist controls and status details this card shows.",
	roomAssistShowDebounce: "Show refresh delay",
	roomAssistShowLiveStatus: "Show live status",
	roomAssistShowMaxDelta: "Show maximum assist delta",
	roomAssistShowSensor: "Show room temperature sensor",
	roomAssistShowSwitch: "Show on/off switch",
	current: "Current",
	currentHumidity: "Humidity",
	currentTemperature: "Current temperature",
	currentTime: "Current time: {time}",
	clear: "Clear",
	confirmDeleteTemplate: "Delete template {template}?",
	confirmTemplate: "Replace {weekday} with {template}?",
	comfort: "Comfort",
	comfortAirQuality: "Air quality",
	comfortAirQualityElevated: "CO2 elevated",
	comfortAirQualityGood: "Good air",
	comfortAirQualityPoor: "Poor air quality",
	comfortAirQualityUnavailable: "CO2 unavailable",
	comfortAutomaticSourceValue: "Automatic: {entity}",
	comfortCo2: "CO2",
	comfortCo2Attention: "Elevated",
	comfortCo2Limits: "CO2 limits",
	comfortCo2LimitsHelp: "Elevated marks an early air-quality warning. Poor marks a more serious CO2 level.",
	comfortCo2Poor: "Poor",
	comfortCo2Sensor: "CO2 sensor",
	comfortCollapseClimate: "Collapse {climate}",
	comfortConditionCold: "Cold",
	comfortConditionColdAndDry: "Cold and dry",
	comfortConditionColdAndHumid: "Cold and humid",
	comfortConditionComfortable: "Comfortable",
	comfortConditionDry: "Dry air",
	comfortConditionHot: "Hot",
	comfortConditionHotAndDry: "Hot and dry",
	comfortConditionHotAndHumid: "Hot and humid",
	comfortConditionHumid: "Humid",
	comfortConditionHumidityComfortable: "Humidity in range",
	comfortConditionMonitoringOff: "Monitoring off",
	comfortConditionNoReadings: "No readings",
	comfortConditionReadingsOutdated: "Readings outdated",
	comfortConditionTemperatureComfortable: "Temperature in range",
	comfortCooler: "Cooler",
	comfortCurrentReadings: "Current readings",
	comfortDataFreshness: "Data freshness",
	comfortDataIssueCo2Missing: "CO2 unavailable",
	comfortDataIssueCo2Stale: "CO2 reading outdated",
	comfortDataIssueHumidityMissing: "Humidity unavailable",
	comfortDataIssueHumidityStale: "Humidity reading outdated",
	comfortDataIssueTemperatureMissing: "Temperature unavailable",
	comfortDataIssueTemperatureStale: "Temperature reading outdated",
	comfortDataPartial: "Partial readings",
	comfortDataStale: "Readings outdated",
	comfortDataUnavailable: "No usable readings",
	comfortDisabledDetail: "Comfort monitoring is off for this climate. No comfort sensors are tracked.",
	comfortDoNotMonitor: "Do not monitor CO2",
	comfortDoNotMonitorHumidity: "Do not monitor humidity",
	comfortDrier: "Drier",
	comfortExpandClimate: "Expand {climate}",
	comfortHumidity: "Humidity",
	comfortHumidityRange: "Humidity range",
	comfortHumidityRangeHelp: "Narrower ranges warn sooner; wider ranges are more tolerant.",
	comfortHumiditySensor: "Humidity sensor",
	comfortIntroDetail: "Monitor temperature, humidity and CO2 locally, then use Velair events in Home Assistant automations.",
	comfortIntroTitle: "Environmental comfort",
	comfortMaximum: "Max",
	comfortMinimum: "Min",
	comfortMoreHumid: "More humid",
	comfortMapCurrentPosition: "Current position: {temperature}, {humidity}",
	comfortNotMonitored: "Not monitored",
	comfortSelectSensor: "Use automatic source",
	comfortStaleAfter: "Stale after",
	comfortStaleAfterHelp: "Maximum age since the last Home Assistant state update. Higher trusts older values longer; lower marks stale sensors sooner.",
	comfortTargetZone: "Comfort range",
	comfortTemperature: "Temperature",
	comfortTemperatureRange: "Temperature range",
	comfortTemperatureRangeHelp: "Narrower ranges warn sooner; wider ranges are more tolerant.",
	comfortTemperatureSensor: "Temperature sensor",
	comfortUnavailable: "Climate unavailable",
	comfortWarmer: "Warmer",
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
	fanMode: "Fan mode",
	horizontalSwingMode: "Horizontal swing",
	invalidStart: "Invalid start time: {start}",
	invalidTemperature: "Invalid temperature for {start}",
	invalidTemperatureRange: "Use {min} to {max}",
	invalidTemperatureStep: "Use {step} steps",
	incompatibleScheduleTargets: "Some schedule targets need review",
	incompatibleScheduleTargetsDescription: "{count} stored target(s) no longer match the thermostat range or temperature step. Open Schedules and save a supported value.",
	operationRecoveryRequired: "Velair saved the data but could not resume",
	operationRecoveryDescription: "Scheduling remains stopped. Reload the Velair integration or restart Home Assistant to complete recovery.",
	operationCancelled: "The operation was cancelled",
	operationCurrentZone: "Working on {zone}",
	operationDefaultCompleted: "Default schedules restored",
	operationDefaultFailed: "Unable to restore default schedules",
	operationDefaultPartial: "Default schedules restored with issues",
	operationDefaultRunning: "Restoring default schedules",
	operationDismiss: "Dismiss operation status",
	operationFailedHelp: "Review the affected climate and Home Assistant logs for details",
	operationFailureCount: "{count} zones with issues: {zones}",
	operationFailureOne: "1 zone with issues: {zones}",
	operationModeCompleted: "{target} mode applied",
	operationModeFailed: "Unable to apply {target} mode",
	operationModePartial: "{target} mode applied with issues",
	operationModeRunning: "Applying {target} mode",
	operationNoZones: "No zones needed changes",
	operationProfileCompleted: "{target} Profile applied",
	operationProfileFailed: "Unable to apply {target} Profile",
	operationProfilePartial: "{target} Profile applied with issues",
	operationProfileRunning: "Applying {target} Profile",
	operationProgress: "{completed} of {total} zones processed",
	operationProgressLabel: "Velair operation progress",
	keep: "Keep",
	keepMode: "Keep mode",
	tagline: "Climate automation that adapts to your life.",
	loading: "Loading scheduler data...",
	loadingEntities: "Loading managed zones...",
	managedEntityAvailable: "Available",
	managedEntityMissing: "Not found",
	managedEntitiesStatus: "Managed thermostats",
	menu: "Menu",
	minutesShort: "min",
	secondsShort: "s",
	providedData: "Provided data",
	profiles: "Profiles",
	profilesAndModes: "Profiles & Modes",
	activeSetup: "Active setup",
	activeSetupDescription: "See what currently controls your zones and change it from one place.",
	activeSetupChange: "Change",
	activeSetupModesHelp: "Choose the Mode that should control the active Profiles.",
	activeSetupAppliedProfiles: "Applied Profiles",
	activeSetupNoProfiles: "No Profiles applied. Zones follow their Default schedules.",
	activeSetupManualProfile: "Activate a Profile manually",
	activeSetupManualProfileHelp: "This replaces all active Profiles and changes the Mode to Manual. To activate additional Profiles together, use a Mode.",
	profilesPanelIntro: "Profiles define alternative climate routines. Modes activate one or more Profiles together.",
	profileLibrarySelectorLabel: "Profile and Mode libraries",
	profilesLibraryDescription: "Define how selected zones should behave.",
	profilesDescription: "A Profile defines how one or more zones behave when it is active.",
	profileActive: "Active profile",
	profilesActive: "Active profiles",
	profileActivate: "Activate profile",
	profileBehaviorDefault: "Default schedule",
	profileBehaviorPause: "Pause schedule",
	profileBehaviorSchedule: "Profile schedule",
	profileBlockAction: "Action",
	profileBrowseIcons: "Browse available icons",
	profileConfirmDelete: "Delete {profile} and all of its zone settings? This cannot be undone.",
	profileConfirmDeleteActive: "{profile} is active. Delete it and return its zones to Default? Other active profiles will remain. This cannot be undone.",
	profileColor: "Profile color",
	profileColorHelp: "Used to identify this profile in selectors and lists.",
	profileCopyTemplate: "Copy template to this day",
	profileCreate: "New profile",
	profileDelete: "Delete profile",
	profileDeleted: "Profile deleted",
	profileDescription: "Description",
	profileDescriptionCharactersRemaining: "{count} characters remaining",
	profileDescriptionTooLong: "Description must be {count} characters or fewer.",
	profileDiscardChanges: "Discard unsaved profile changes?",
	profileCollapseClimate: "Collapse {climate}",
	profileExpandClimate: "Expand {climate}",
	profileIcon: "Icon",
	profileIconHelp: "Use a Material Design Icons key, for example mdi:briefcase-outline.",
	profileActiveContext: "Active climate context",
	modeBuiltInHelp: "Built-in modes cannot be renamed or deleted.",
	modeInformation: "About {mode}",
	modeChooseProfile: "Choose a profile",
	modeConfirmDelete: "Delete the mode {mode}? This cannot be undone.",
	modeCreate: "New mode",
	modeDelete: "Delete mode",
	modeDeleted: "Mode deleted",
	modeDiscardChanges: "Discard unsaved mode changes?",
	modeDefault: "Default",
	modeDefaultDescription: "Deactivates profiles and restores each zone's default schedule.",
	modeManual: "Manual",
	modeManualDescription: "Active Profiles are not controlled by a Mode.",
	modeCustomDescription: "Activates the mapped profiles: {profile}.",
	modeChange: "Change Mode",
	modeLabel: "Mode",
	modeMappedProfile: "Mapped profile: {profile}",
	modeMappedProfileMissing: "Mapped profile unavailable: {profile}",
	modeMappedProfiles: "Mapped profiles: {profiles}",
	modeName: "Mode name",
	modeNameDuplicate: "Use a unique mode name.",
	modeNameHelp: "This value appears in Home Assistant's mode selector.",
	modeNameRequired: "Mode name is required.",
	modeNameTooLong: "Mode name must be {count} characters or fewer.",
	modeProfile: "Mapped profile",
	modeProfiles: "Mapped profiles",
	modeProfileHelp: "Selecting this mode activates all selected profiles. A zone can only belong to one of them.",
	modeProfileRequired: "Select at least one profile and avoid profiles that configure the same zone.",
	modeSaved: "Mode saved",
	modeSelectToBegin: "Select a custom mode to edit it, or create one",
	modeUnableDelete: "Unable to delete the mode",
	modeUnableActivate: "Unable to change the mode",
	modeUnableSave: "Unable to save the mode",
	modesDescription: "A Mode activates one or more Profiles together from Velair or Home Assistant.",
	modesLibraryDescription: "Activate one or more Profiles together.",
	modesEntityNote: "Automations can select a Mode through select.velair_mode or activate one Profile with velair.activate_profile and its Automation ID.",
	modesTitle: "Modes",
	profilesActiveCount: "{count} active profiles",
	profileId: "Automation ID",
	profileIdReadonlyHelp: "Stable read-only ID used by automations and services.",
	profileInvalidIcon: "Use a valid key in the form mdi:icon-name.",
	profileInvalidColor: "Choose a valid color in the #RRGGBB format.",
	profileInvalidSchedule: "Check that every block has a valid, unique time and temperature.",
	profileName: "Profile name",
	profileNameRequired: "Profile name is required",
	profileNewName: "New profile",
	profileNoDescription: "No description",
	profileNoneCreated: "No profiles",
	profileDefaultDescription: "Each zone is using its default schedule.",
	profileOverviewLabel: "Profile",
	profilePauseAction: "While paused",
	profilePauseKeep: "Leave climate unchanged",
	profilePauseTurnOff: "Turn climate off",
	profileRemovedElsewhere: "This profile was removed elsewhere. Select or create another profile.",
	profileSaved: "Profile saved",
	profileSelectToBegin: "Select a profile to edit it",
	profileUnableActivate: "Unable to activate profile",
	profileUnableDelete: "Unable to delete profile",
	profileZoneBehavior: "Zone behavior",
	portability: "Portability",
	portabilityDescription: "Export or import Velair data with a versioned JSON file.",
	portabilityFileReady: "{file} ready",
	portabilityIncluded: "Included",
	portabilitySettingsSection: "Settings",
	portabilityTemplatesSection: "Templates",
	portabilityZonesSection: "Thermostat schedules",
	portabilityPreconditioningLearningSection: "Preconditioning learning",
	portabilityProfilesSection: "Climate profiles",
	portabilityModesSection: "Modes",
	preconditioningImportSkipped: "Skipped preconditioning learning ({count}). These thermostats are not managed here: {entities}",
	portableExported: "Export file created",
	portableImported: "Import completed",
	importData: "Import",
	importFile: "Import file",
	chooseFile: "Choose file",
	climateOptions: "Climate options",
	climateOptionsAdd: "Add optional settings",
	noFileSelected: "No file selected",
	exportData: "Export",
	invalidImportFile: "This is not a valid Velair export file",
	importOverwriteWarning: "Importing will overwrite existing values. They cannot be recovered unless you exported them first.",
	noImportSections: "No importable sections found",
	legacyImportTemperatureUnit: "This older backup does not record a temperature unit. Velair will treat its temperatures as Celsius and convert them to {target} when needed.",
	notSet: "Not set",
	maintenance: "Maintenance",
	maintenanceDescription: "Technical version details for troubleshooting.",
	frontendBuild: "Frontend build",
	portableFormatVersion: "Portable/export format",
	internalStorageVersion: "Storage/model",
	integrationVersion: "Integration version",
	resetVelair: "Reset Velair",
	resetVelairDescription: "Deletes all stored Velair data, including schedules, templates, panel preferences, active boosts and pauses, Comfort and Room Assist settings, Adaptive Preconditioning settings and learning, and startup behavior. It then recreates unit-aware defaults for the currently managed thermostats.",
	confirmReset: "Reset all stored Velair data? This cannot be undone unless you exported your data first.",
	confirmResetPreconditioningLearning: "Reset adaptive preconditioning learning for {direction}? Schedules and settings will be kept.",
	confirmResetPreconditioningSettings: "Restore the default preconditioning settings for this thermostat? Learning samples will be kept.",
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
	overviewZoneApplied: "Applied",
	overviewZoneAir: "Air: {status}",
	overviewZoneBoost: "Boost",
	overviewZoneComfort: "Comfort: {status}",
	overviewZoneManual: "Manual",
	overviewZonePaused: "Paused",
	overviewZonePreconditioning: "Preconditioning",
	overviewZoneResumes: "Resumes {time}",
	overviewZoneRoom: "Room",
	overviewZoneRoomAssist: "Room Assist {delta}",
	overviewZoneScheduled: "Scheduled",
	overviewZoneSensorIssue: "Sensor data incomplete",
	overviewZoneTarget: "Target",
	overviewZoneUntil: "Until {time}",
	overviewZoneUntilResumed: "Until resumed",
	overviewZoneReadyAt: "Ready at {time}",
	overviewZoneNextAt: "Next at {time}",
	overviewZoneAutomationOff: "Automation off",
	overviewZoneRoomAssistThermalFlow: "Room Assist temperature flow",
	overviewZoneSensor: "Sensor",
	overviewZoneClimate: "Climate",
	overviewZoneTemperature: "Temperature",
	overviewZoneSetpoint: "Setpoint",
	overviewZoneScheduledSetpoint: "Scheduled",
	overviewZoneOffset: "Offset",
	overviewZoneRoomAssistActive: "Active",
	overviewZoneRoomAssistHolding: "Holding",
	overviewZoneComfortLabel: "Comfort",
	overviewZoneAirLabel: "Air",
	overviewZoneDataLabel: "Data",
	pause: "Pause",
	pauseActive: "Paused",
	pauseApplied: "Scheduler paused",
	pauseDuration: "Pause duration (min)",
	pauseFrom: "From",
	pauseIndefinite: "No end time",
	pauseRemaining: "Resumes in",
	pauseTo: "To",
	preconditioning: "Preconditioning",
	preconditioningEnabled: "Preconditioning enabled",
	preconditioningCool: "Cool",
	preconditioningCoolingFallbackLead: "Cooling fallback (min)",
	preconditioningDirectionSamples: "{count}/{required}",
	preconditioningHeat: "Heat",
	preconditioningHeatingFallbackLead: "Heating fallback (min)",
	preconditioningDirectionStatus: "Status",
	preconditioningExpandClimate: "Expand {climate}",
	preconditioningIntroDetail: "Let Velair calculate when a scheduled comfort target should start so the room is closer to temperature on time.",
	preconditioningIntroTitle: "Adaptive comfort timing",
	preconditioningAdaptivePercentile: "Dynamic comfort percentile",
	preconditioningAdaptivePercentileHelp: "On raises the margin after too many partial attempts and reduces it after consistently complete ones.",
	preconditioningCalculationCombined: "Combined",
	preconditioningCalculationDetails: "Calculation details",
	preconditioningCalculationFinalLead: "Final lead",
	preconditioningCalculationPartialFloor: "Partial floor",
	preconditioningCalculationReachedEstimate: "Reached estimate",
	preconditioningCalculationRounded: "Rounded",
	preconditioningCalculationSampleCounts: "Reached: {reached} · Partial: {partial} · Invalid: {invalid}",
	preconditioningCalculationSamples: "Samples",
	preconditioningComfortPercentile: "Comfort percentile",
	preconditioningComfortPercentileHelp: "Higher starts earlier using slower learned cases; lower starts later with less margin.",
	preconditioningComfortPercentileLabel: "Comfort percentile",
	preconditioningCollapseClimate: "Collapse {climate}",
	preconditioningFallbackInactive: "Adaptive model active",
	preconditioningFallbackLabel: "Fallback",
	preconditioningFallbackLead: "{minutes} min",
	preconditioningFallbackMinutesPerDegree: "Initial model",
	preconditioningFallbackMinutesPerDegreeHelp: "Higher starts earlier before enough learning exists; lower starts later.",
	preconditioningHistorySize: "History size",
	preconditioningHistorySizeHelp: "Higher keeps more useful samples; lower forgets older samples sooner.",
	preconditioningHistory: "History",
	preconditioningInvalidEvents: "Invalid",
	preconditioningLastSample: "Last sample",
	preconditioningLeadTime: "{minutes} min early",
	preconditioningLearning: "Learning locally",
	preconditioningLearningStatus: "Learning status",
	preconditioningLearningDisabled: "Learning disabled",
	preconditioningLearningMoreData: "More data needed",
	preconditioningLearningReady: "Learning ready",
	preconditioningLimitedByMax: "Limited by maximum",
	preconditioningLivePrediction: "Live prediction",
	preconditioningLivePredictionHelp: "Uses the next real block to show how the calculated preconditioning start changes.",
	preconditioningMaxLead: "Maximum start (min)",
	preconditioningMaxLeadHelp: "Higher permits earlier starts; lower places a tighter limit on lead time.",
	preconditioningMaximumLabel: "Maximum",
	preconditioningMinimumDelta: "Minimum temperature delta",
	preconditioningMinimumDeltaHelp: "Higher ignores larger small gaps; lower reacts to smaller temperature differences.",
	preconditioningMinStart: "Minimum start (min)",
	preconditioningMinStartHelp: "Higher ignores short predicted leads; lower allows smaller early starts.",
	preconditioningModelHistory: "Similar history",
	preconditioningModel: "Learning model",
	preconditioningModelInitial: "Initial model",
	preconditioningModelSource: "Model source",
	preconditioningNextBlock: "Next block",
	preconditioningNoUpcomingDirectionEvent: "No upcoming {direction} block to predict.",
	preconditioningNormalStart: "Normal start",
	preconditioningNotSupported: "Not supported",
	preconditioningPartialEvents: "Partial",
	preconditioningPartialSamples: "{count} partial",
	preconditioningPartialExpiry: "Partial expiry (days)",
	preconditioningPartialExpiryHelp: "Higher lets incomplete attempts influence predictions longer; lower expires them sooner.",
	preconditioningQualityComplete: "Complete",
	preconditioningQualityInvalid: "Invalid",
	preconditioningQualityPartial: "Partial",
	preconditioningRecencyDecay: "Recency decay (days)",
	preconditioningRecencyDecayHelp: "Higher makes old samples lose weight more slowly; lower favors recent behavior.",
	preconditioningReachedEvents: "Reached",
	preconditioningResetLearning: "Reset learning",
	preconditioningLearningResetDone: "{direction} learning reset",
	preconditioningSimilarSamples: "Similar samples",
	preconditioningSimilarSamplesHelp: "Higher considers more nearby history; lower focuses on the closest cases.",
	preconditioningUnsupportedDirection: "Not supported by this thermostat",
	preconditioningOutdoorTemperatureEntity: "Outdoor temperature sensor",
	preconditioningOutdoorTemperatureEntityHelp: "Provides local outdoor context for comparing learned samples; it does not change the initial model.",
	preconditioningOutdoorContext: "Outdoor context",
	preconditioningOutdoorDisabled: "Disabled",
	preconditioningSelectOutdoorSensor: "Select sensor",
	preconditioningResetSettings: "Restore default settings",
	preconditioningSettingsResetDone: "Preconditioning settings restored",
	preconditioningStarts: "Starts",
	preconditioningTargetBy: "Target by",
	preconditioningTiming: "Timing and limits",
	preconditioningUnavailable: "Thermostat unavailable. Preconditioning cannot be enabled.",
	preconditioningUseOutdoorTemperature: "Use outdoor temperature",
	preconditioningUseOutdoorTemperatureHelp: "On includes outdoor temperature when choosing similar learned samples.",
	resume: "Resume",
	resumed: "Scheduler resumed",
	resizeEnd: "Adjust end",
	resizeStart: "Adjust start",
	schedulerControls: "Scheduler controls",
	schedules: "Schedules",
	sensors: "Room Assist",
	roomSensorAppliedTarget: "Applied target",
	roomSensorAssist: "Room Sensor Assist",
	roomSensorAssistBadge: "Room Assist",
	roomSensorAssistEnabled: "Room Sensor Assist enabled",
	roomSensorAssistHelp: "Temporarily adjusts the climate target so the room sensor can reach the scheduled temperature.",
	roomSensorAssistDisabledDetail: "A room sensor is selected, but Room Sensor Assist is off. Velair keeps using the climate temperature until this switch is enabled.",
	roomSensorAssistDebounce: "Refresh delay",
	roomSensorAssistDebounceHelp: "Seconds to wait after room or climate temperature changes before recalculating the assisted target. Use 0 for immediate updates.",
	roomSensorAssistMaxDelta: "Maximum assist delta",
	roomSensorAssistMaxDeltaHelp: "Higher can keep the valve open longer; lower limits how far Velair can adjust the climate target.",
	roomSensorAssistOffset: "Assist offset",
	roomSensorAssistOffsetHelp: "Temporary offset applied to the climate target so the room sensor can keep moving toward the scheduled temperature.",
	roomSensorAssistCorrectionValue: "Offset {value}",
	roomSensorAssistCorrectionActiveHelp: "Room Assist is adjusting the climate setpoint. This does not indicate whether the climate is actively heating or cooling.",
	roomSensorAssistNoCorrection: "Offset 0 · Holding",
	roomSensorAssistNoCorrectionHelp: "Room Assist is not applying a setpoint correction. The room and scheduled temperatures may still differ.",
	roomSensorBlockActiveSince: "Active from {time}",
	roomSensorBlockMode: "Mode: {mode}",
	roomSensorBlockScheduled: "Scheduled for {time}",
	roomSensorBlockStartedEarly: "Started at {time}",
	roomSensorBlockTarget: "Target: {target}",
	roomSensorGapAboveTarget: "{value} above target",
	roomSensorGapBelowTarget: "{value} below target",
	roomSensorClimateTarget: "Climate target",
	roomSensorClimateTemperature: "Climate reading",
	roomSensorCollapseClimate: "Collapse {climate}",
	roomSensorControl: "Room Sensor Assist",
	roomSensorExpandClimate: "Expand {climate}",
	roomSensorIntroDetail: "Use a room temperature sensor to guide the climate target while Velair runs managed temperature blocks.",
	roomSensorIntroTitle: "Room temperature control",
	roomSensorLiveStatus: "Live status",
	roomSensorNoActiveBlock: "No active temperature block",
	roomSensorNoActiveBlockDetail: "Room Assist will update when a managed temperature block is active.",
	roomSensorNotConfigured: "Select a room sensor first",
	roomSensorRoomTemperature: "Room sensor",
	roomSensorRemainingToTarget: "To target",
	roomSensorRemainingValue: "{value} left",
	roomSensorScheduledTarget: "Scheduled target",
	roomSensorSelectSensor: "Select room sensor",
	roomSensorStatusAssisting: "Assisting",
	roomSensorStatusBlocked: "Blocked",
	roomSensorStatusDisabled: "Disabled",
	roomSensorStatusHolding: "Holding",
	roomSensorStatusIdle: "Idle",
	roomSensorStatusNotConfigured: "Not configured",
	roomSensorStatusReady: "Ready",
	roomSensorStatusUnavailable: "Unavailable",
	roomSensorTemperatureEntity: "Room temperature sensor",
	roomSensorTemperatureEntityHelp: "Sensor that Room Sensor Assist uses as the real room temperature while adjusting the climate target.",
	roomSensorTemperatureScale: "Room Assist temperature scale",
	roomSensorUnavailable: "Climate unavailable",
	roomSensorValueUnavailable: "Unavailable",
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
	startsAt: "Starts",
	applyScheduleOnStartup: "Apply active schedule after startup",
	applyScheduleOnStartupDescription: "When Home Assistant starts, Velair can apply the current schedule block to the managed thermostats instead of leaving them as they are.",
	start: "Start",
	status: "Status",
	stop: "Stop",
	supportedFanModes: "Fan modes",
	supportedHorizontalSwingModes: "Horizontal swing modes",
	supportedPresetModes: "Presets",
	supportedSwingModes: "Swing modes",
	presetMode: "Preset",
	swingMode: "Swing",
	temp: "Temp",
	temperatureRange: "Temperature range",
	temperatureUnit: "Temperature unit",
	temperatureUnitManagedByHomeAssistant: "Detected from Home Assistant. Change this value in Home Assistant's unit system settings.",
	temperatureMigrationRequired: "Velair needs your attention",
	temperatureMigrationStopped: "The scheduler and thermal configuration are locked because Home Assistant changed temperature units. Open Velair Settings to migrate safely.",
	temperatureMigrationQuestion: "Migrate stored temperatures from {source} to {target}?",
	temperatureMigrationExplanation: "Continue only if every stored Velair temperature is still in {source}. This migration updates schedules, templates, overrides, Comfort, Room Assist, preconditioning settings, rates, and learning data before resuming the scheduler. If any stored value is already in {target}, migrating it will make that value incorrect.",
	temperatureMigrationUse: "Migrate {source} to {target}",
	temperatureMigrationConfirm: "Confirm that all stored Velair temperature data is in {source} and convert it to {target}? Do not continue if any stored value is already in {target}, because it will become incorrect. The scheduler remains stopped if the migration cannot be saved.",
	temperatureMigrationComplete: "Temperature data updated and scheduler resumed",
	temperatureMigrationFailed: "Unable to update temperature data",
	temperatureLegacyResetQuestion: "Reset legacy Celsius data for {target}?",
	temperatureLegacyResetExplanation: "This installation was created by a Velair version that stored Celsius values only. Because Home Assistant now uses {target}, reset Velair to discard the old data and create safe unit-aware defaults. Future Home Assistant unit changes will offer a full data conversion instead.",
	temperatureLegacyResetStopped: "The scheduler is stopped because this legacy installation contains Celsius-only data while Home Assistant uses Fahrenheit. Open Velair Settings and use Reset Velair to create Fahrenheit defaults.",
	temperatureStep: "Step",
	temperatureStepNotReported: "Not reported by Home Assistant",
	temperatureStepNotReportedDescription: "This climate does not publish target_temp_step. Velair does not infer a temperature step.",
	targetTemp: "Target temp",
	targetHumidity: "Target humidity",
	targetBy: "Target by",
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
		paused: "Paused"
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
		off: "Off",
		preheating: "Preheating",
		defrosting: "Defrosting"
	}
}, st = /* @__PURE__ */ t({ es: () => ct }), ct = {
	addBlock: "Añadir bloque",
	apply: "Aplicar",
	cloneDayToDays: "Clonar el día en",
	cloneDayToThermostats: "Clonar el día en",
	cloneAction: "Clonar",
	appliedDays: "Clonado en {count} día{suffix}",
	appliedTemplateTargets: "Plantilla aplicada a {count} destinos",
	appliedThermostats: "Clonado en {count} termostato{suffix}",
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
	boostUntil: "Finaliza en",
	blocks: "Bloques",
	build: "Compilación",
	cardView: "Vista de la tarjeta",
	activeSetupCardControls: "Controles de configuración activa",
	activeSetupCardControlsBoth: "Modos y Perfiles",
	activeSetupCardControlsDescription: "Elige qué puede cambiar esta tarjeta. El Modo actual y los Perfiles aplicados seguirán visibles.",
	activeSetupCardControlsModes: "Solo Modos",
	activeSetupCardControlsProfiles: "Solo Perfiles",
	cardViewOverviewBoosts: "Resumen: refuerzos activos",
	cardViewOverviewEvents: "Resumen: próximos eventos",
	cardViewOverviewStatus: "Resumen: estado del planificador",
	cardViewOverviewTimeline: "Resumen: línea temporal de hoy",
	cardViewOverviewZones: "Resumen: zonas",
	cardViewActiveSetup: "Perfiles: configuración activa",
	cardViewSchedules: "Planificación: editor",
	cardViewSensors: "Sensor de estancia: configuración y estado",
	cardViewComfort: "Confort: configuración y estado",
	cardViewPreconditioning: "Preacondicionamiento: configuración y estado",
	cardThermostatHidden: "Oculto en esta tarjeta",
	cardThermostatVisible: "Visible en esta tarjeta",
	cardThermostats: "Termostatos de esta tarjeta",
	cardThermostatsDescription: "Elige qué termostatos muestra esta tarjeta y ordénalos.",
	comfortCardVisibility: "Visibilidad de confort",
	comfortCardVisibilityDescription: "Elige qué configuración y gráficas de confort muestra esta tarjeta.",
	comfortCardShowCo2: "Mostrar gráfica de CO2",
	comfortCardShowConfiguration: "Mostrar configuración",
	comfortCardShowHumidity: "Mostrar gráfica de humedad",
	comfortCardShowTemperature: "Mostrar gráfica de temperatura",
	roomAssistCardVisibility: "Visibilidad del sensor de estancia",
	roomAssistCardVisibilityDescription: "Elige qué controles y detalles de estado muestra esta tarjeta.",
	roomAssistShowDebounce: "Mostrar retraso de actualización",
	roomAssistShowLiveStatus: "Mostrar estado actual",
	roomAssistShowMaxDelta: "Mostrar ajuste máximo",
	roomAssistShowSensor: "Mostrar sensor de temperatura de estancia",
	roomAssistShowSwitch: "Mostrar interruptor de encendido",
	current: "Actual",
	currentHumidity: "Humedad",
	currentTemperature: "Temperatura actual",
	currentTime: "Hora actual: {time}",
	clear: "Limpiar",
	confirmDeleteTemplate: "¿Eliminar la plantilla {template}?",
	confirmTemplate: "¿Reemplazar {weekday} por {template}?",
	comfort: "Confort",
	comfortAirQuality: "Calidad del aire",
	comfortAirQualityElevated: "CO2 elevado",
	comfortAirQualityGood: "Buena",
	comfortAirQualityPoor: "Calidad del aire deficiente",
	comfortAirQualityUnavailable: "CO2 no disponible",
	comfortAutomaticSourceValue: "Automático: {entity}",
	comfortCo2: "CO2",
	comfortCo2Attention: "Elevado",
	comfortCo2Limits: "Límites de CO2",
	comfortCo2LimitsHelp: "El nivel «Elevado» sirve como aviso temprano sobre la calidad del aire. «Deficiente» señala un nivel de CO2 más preocupante.",
	comfortCo2Poor: "Deficiente",
	comfortCo2Sensor: "Sensor de CO2",
	comfortCollapseClimate: "Ocultar {climate}",
	comfortConditionCold: "Frío",
	comfortConditionColdAndDry: "Frío y seco",
	comfortConditionColdAndHumid: "Frío y húmedo",
	comfortConditionComfortable: "Confortable",
	comfortConditionDry: "Ambiente seco",
	comfortConditionHot: "Calor",
	comfortConditionHotAndDry: "Caluroso y seco",
	comfortConditionHotAndHumid: "Caluroso y húmedo",
	comfortConditionHumid: "Ambiente húmedo",
	comfortConditionHumidityComfortable: "Humedad adecuada",
	comfortConditionMonitoringOff: "Monitorización desactivada",
	comfortConditionNoReadings: "Sin lecturas",
	comfortConditionReadingsOutdated: "Lecturas desactualizadas",
	comfortConditionTemperatureComfortable: "Temperatura adecuada",
	comfortCooler: "Más frío",
	comfortCurrentReadings: "Lecturas actuales",
	comfortDataFreshness: "Vigencia de los datos",
	comfortDataIssueCo2Missing: "CO2 no disponible",
	comfortDataIssueCo2Stale: "Lectura de CO2 desactualizada",
	comfortDataIssueHumidityMissing: "Humedad no disponible",
	comfortDataIssueHumidityStale: "Lectura de humedad desactualizada",
	comfortDataIssueTemperatureMissing: "Temperatura no disponible",
	comfortDataIssueTemperatureStale: "Lectura de temperatura desactualizada",
	comfortDataPartial: "Lecturas parciales",
	comfortDataStale: "Lecturas desactualizadas",
	comfortDataUnavailable: "Sin lecturas útiles",
	comfortDisabledDetail: "La monitorización de confort está desactivada para este termostato. Velair no supervisa ningún sensor de confort.",
	comfortDoNotMonitor: "No monitorizar CO2",
	comfortDoNotMonitorHumidity: "No monitorizar humedad",
	comfortDrier: "Más seco",
	comfortExpandClimate: "Mostrar {climate}",
	comfortHumidity: "Humedad",
	comfortHumidityRange: "Rango de humedad",
	comfortHumidityRangeHelp: "Con rangos más estrechos, Velair avisa antes; los rangos más amplios son más tolerantes.",
	comfortHumiditySensor: "Sensor de humedad",
	comfortIntroDetail: "Monitoriza temperatura, humedad y CO2 de forma local, y usa los eventos de Velair en automatizaciones de Home Assistant.",
	comfortIntroTitle: "Confort ambiental",
	comfortMaximum: "Máx.",
	comfortMinimum: "Mín.",
	comfortMoreHumid: "Más húmedo",
	comfortMapCurrentPosition: "Posición actual: {temperature}, {humidity}",
	comfortNotMonitored: "Sin supervisión",
	comfortSelectSensor: "Usar fuente automática",
	comfortStaleAfter: "Desactualizado tras",
	comfortStaleAfterHelp: "Tiempo máximo desde la última actualización de estado en Home Assistant. Un valor mayor confía más tiempo en lecturas antiguas; uno menor marca antes los sensores como desactualizados.",
	comfortTargetZone: "Rango confortable",
	comfortTemperature: "Temperatura",
	comfortTemperatureRange: "Rango de temperatura",
	comfortTemperatureRangeHelp: "Con rangos más estrechos, Velair avisa antes; los rangos más amplios son más tolerantes.",
	comfortTemperatureSensor: "Sensor de temperatura",
	comfortUnavailable: "Termostato no disponible",
	comfortWarmer: "Más cálido",
	createTemplate: "Crear plantilla",
	customTemplateName: "Nombre de la plantilla",
	day: "Día",
	daySchedule: "Planificación del día",
	defaultZone: "Primer termostato gestionado",
	deleteBlock: "Eliminar bloque",
	deleteTemplate: "Eliminar plantilla",
	dismiss: "Cerrar",
	duplicateStart: "Hora duplicada: {start}",
	entityDiagnosticMissing: "Entidad no encontrada",
	entityDiagnosticNoModes: "No informa de los modos HVAC compatibles",
	entityDiagnosticNoRange: "No informa del rango de temperatura",
	entityDiagnosticNotClimate: "La entidad no pertenece al dominio climate de Home Assistant",
	fanMode: "Modo del ventilador",
	horizontalSwingMode: "Oscilación horizontal",
	entityDiagnosticOk: "La configuración del termostato parece correcta",
	invalidStart: "Hora no válida: {start}",
	invalidTemperature: "Temperatura no válida para {start}",
	invalidTemperatureRange: "Debe estar entre {min} y {max}",
	invalidTemperatureStep: "Utiliza pasos de {step}",
	incompatibleScheduleTargets: "Hay consignas que necesitan revisión",
	incompatibleScheduleTargetsDescription: "Consignas guardadas que ya no coinciden con el rango o el paso del termostato: {count}. Abre Planificación y guarda un valor compatible.",
	operationRecoveryRequired: "Velair ha guardado los datos, pero no ha podido reanudarse",
	operationRecoveryDescription: "El planificador sigue detenido. Recarga la integración de Velair o reinicia Home Assistant para completar la recuperación.",
	operationCancelled: "La operación se ha cancelado",
	operationCurrentZone: "Procesando {zone}",
	operationDefaultCompleted: "Planificaciones predeterminadas restauradas",
	operationDefaultFailed: "No se han podido restaurar las planificaciones predeterminadas",
	operationDefaultPartial: "Planificaciones predeterminadas restauradas con problemas",
	operationDefaultRunning: "Restaurando las planificaciones predeterminadas",
	operationDismiss: "Descartar el estado de la operación",
	operationFailedHelp: "Revisa el climate afectado y los registros de Home Assistant para obtener más detalles",
	operationFailureCount: "{count} zonas con problemas: {zones}",
	operationFailureOne: "1 zona con problemas: {zones}",
	operationModeCompleted: "Modo {target} aplicado",
	operationModeFailed: "No se ha podido aplicar el modo {target}",
	operationModePartial: "Modo {target} aplicado con problemas",
	operationModeRunning: "Aplicando el modo {target}",
	operationNoZones: "Ninguna zona necesitaba cambios",
	operationProfileCompleted: "Perfil {target} aplicado",
	operationProfileFailed: "No se ha podido aplicar el Perfil {target}",
	operationProfilePartial: "Perfil {target} aplicado con problemas",
	operationProfileRunning: "Aplicando el Perfil {target}",
	operationProgress: "{completed} de {total} zonas procesadas",
	operationProgressLabel: "Progreso de la operación de Velair",
	keep: "Mantener",
	keepMode: "Mantener modo",
	tagline: "Automatiza la climatización para adaptarla a tu vida.",
	loading: "Cargando planificación...",
	loadingEntities: "Cargando termostatos gestionados...",
	managedEntityAvailable: "Disponible",
	managedEntityMissing: "No encontrada",
	managedEntitiesStatus: "Termostatos gestionados",
	menu: "Menú",
	minutesShort: "min",
	secondsShort: "s",
	providedData: "Datos proporcionados",
	profiles: "Perfiles",
	profilesAndModes: "Perfiles y modos",
	activeSetup: "Configuración activa",
	activeSetupDescription: "Consulta qué controla ahora tus zonas y cámbialo desde un único lugar.",
	activeSetupChange: "Cambiar",
	activeSetupModesHelp: "Elige el Modo que debe controlar los Perfiles activos.",
	activeSetupAppliedProfiles: "Perfiles aplicados",
	activeSetupNoProfiles: "No hay Perfiles aplicados. Las zonas siguen sus planificaciones Predeterminadas.",
	activeSetupManualProfile: "Activar un Perfil manualmente",
	activeSetupManualProfileHelp: "Sustituye todos los Perfiles activos y cambia el Modo a Manual. Para activar varios Perfiles juntos, utiliza un Modo.",
	profilesPanelIntro: "Los Perfiles definen rutinas climáticas alternativas. Los Modos activan uno o varios Perfiles a la vez.",
	profileLibrarySelectorLabel: "Bibliotecas de Perfiles y Modos",
	profilesLibraryDescription: "Define cómo deben comportarse las zonas elegidas.",
	profilesDescription: "Un Perfil define cómo se comportan una o varias zonas mientras está activo.",
	profileActive: "Perfil activo",
	profilesActive: "Perfiles activos",
	profileActivate: "Activar perfil",
	profileBehaviorDefault: "Planificación predeterminada",
	profileBehaviorPause: "Pausar planificación",
	profileBehaviorSchedule: "Planificación del perfil",
	profileBlockAction: "Acción",
	profileBrowseIcons: "Ver iconos disponibles",
	profileConfirmDelete: "¿Eliminar {profile} y todos sus ajustes de zona? Esta acción no se puede deshacer.",
	profileConfirmDeleteActive: "¿Eliminar {profile}, que está activo, y devolver sus zonas a Predeterminado? Los demás perfiles activos se mantendrán. Esta acción no se puede deshacer.",
	profileColor: "Color del perfil",
	profileColorHelp: "Se utiliza para identificar este perfil en selectores y listados.",
	profileCopyTemplate: "Copiar plantilla a este día",
	profileCreate: "Nuevo perfil",
	profileDelete: "Eliminar perfil",
	profileDeleted: "Perfil eliminado",
	profileDescription: "Descripción",
	profileDescriptionCharactersRemaining: "Quedan {count} caracteres",
	profileDescriptionTooLong: "La descripción debe tener {count} caracteres o menos.",
	profileDiscardChanges: "¿Descartar los cambios del perfil sin guardar?",
	profileCollapseClimate: "Contraer {climate}",
	profileExpandClimate: "Expandir {climate}",
	profileIcon: "Icono",
	profileIconHelp: "Usa una clave de Material Design Icons, por ejemplo mdi:briefcase-outline.",
	profileActiveContext: "Contexto climático activo",
	modeBuiltInHelp: "Los modos integrados no se pueden renombrar ni eliminar.",
	modeInformation: "Acerca de {mode}",
	modeChooseProfile: "Elige un perfil",
	modeConfirmDelete: "¿Eliminar el modo {mode}? Esta acción no se puede deshacer.",
	modeCreate: "Nuevo modo",
	modeDelete: "Eliminar modo",
	modeDeleted: "Modo eliminado",
	modeDiscardChanges: "¿Descartar los cambios del modo sin guardar?",
	modeDefault: "Predeterminado",
	modeDefaultDescription: "Desactiva los perfiles y recupera la planificación predeterminada de cada zona.",
	modeManual: "Manual",
	modeManualDescription: "Los Perfiles activos no están controlados por un Modo.",
	modeCustomDescription: "Activa los perfiles relacionados: {profile}.",
	modeChange: "Cambiar el modo",
	modeLabel: "Modo",
	modeMappedProfile: "Perfil relacionado: {profile}",
	modeMappedProfileMissing: "Perfil relacionado no disponible: {profile}",
	modeMappedProfiles: "Perfiles relacionados: {profiles}",
	modeName: "Nombre del modo",
	modeNameDuplicate: "Usa un nombre de modo único.",
	modeNameHelp: "Este valor aparece en el selector de modos de Home Assistant.",
	modeNameRequired: "El nombre del modo es obligatorio.",
	modeNameTooLong: "El nombre del modo debe tener {count} caracteres o menos.",
	modeProfile: "Perfil relacionado",
	modeProfiles: "Perfiles relacionados",
	modeProfileHelp: "Al seleccionar este modo se activan todos los perfiles elegidos. Una zona solo puede pertenecer a uno de ellos.",
	modeProfileRequired: "Selecciona al menos un perfil y evita perfiles que configuren la misma zona.",
	modeSaved: "Modo guardado",
	modeSelectToBegin: "Selecciona un modo personalizado para editarlo o crea uno",
	modeUnableDelete: "No se ha podido eliminar el modo",
	modeUnableActivate: "No se ha podido cambiar el modo",
	modeUnableSave: "No se ha podido guardar el modo",
	modesDescription: "Un Modo activa uno o varios Perfiles a la vez desde Velair o Home Assistant.",
	modesLibraryDescription: "Activa uno o varios Perfiles a la vez.",
	modesEntityNote: "Las automatizaciones pueden seleccionar un Modo mediante select.velair_mode o activar un Perfil con velair.activate_profile y su ID de automatización.",
	modesTitle: "Modos",
	profilesActiveCount: "{count} perfiles activos",
	profileId: "ID de automatización",
	profileIdReadonlyHelp: "ID estable de solo lectura utilizado por automatizaciones y servicios.",
	profileInvalidIcon: "Usa una clave válida con el formato mdi:nombre-del-icono.",
	profileInvalidColor: "Elige un color válido con el formato #RRGGBB.",
	profileInvalidSchedule: "Comprueba que cada bloque tenga una hora y temperatura válidas y no repetidas.",
	profileName: "Nombre del perfil",
	profileNameRequired: "El nombre del perfil es obligatorio",
	profileNewName: "Nuevo perfil",
	profileNoDescription: "Sin descripción",
	profileNoneCreated: "No hay perfiles",
	profileDefaultDescription: "Cada zona utiliza su planificación predeterminada.",
	profileOverviewLabel: "Perfil",
	profilePauseAction: "Durante la pausa",
	profilePauseKeep: "Mantener el clima sin cambios",
	profilePauseTurnOff: "Apagar el clima",
	profileRemovedElsewhere: "Este perfil se ha eliminado desde otra sesión. Selecciona o crea otro perfil.",
	profileSaved: "Perfil guardado",
	profileSelectToBegin: "Selecciona un perfil para editarlo",
	profileUnableActivate: "No se ha podido activar el perfil",
	profileUnableDelete: "No se ha podido eliminar el perfil",
	profileZoneBehavior: "Comportamiento de la zona",
	portability: "Importación y exportación",
	portabilityDescription: "Exporta o importa datos de Velair con un archivo JSON versionado.",
	portabilityFileReady: "Archivo preparado: {file}",
	portabilityIncluded: "Incluido",
	portabilitySettingsSection: "Ajustes",
	portabilityTemplatesSection: "Plantillas",
	portabilityZonesSection: "Planificación de termostatos",
	portabilityPreconditioningLearningSection: "Aprendizaje de preacondicionamiento",
	portabilityProfilesSection: "Perfiles climáticos",
	portabilityModesSection: "Modos",
	preconditioningImportSkipped: "Historiales de preacondicionamiento omitidos ({count}). Estos termostatos no están gestionados aquí: {entities}",
	portableExported: "Archivo de exportación creado",
	portableImported: "Importación completada",
	importData: "Importar",
	importFile: "Archivo de importación",
	chooseFile: "Seleccionar archivo",
	climateOptions: "Opciones del termostato",
	climateOptionsAdd: "Añadir ajustes opcionales",
	noFileSelected: "Ningún archivo seleccionado",
	exportData: "Exportar",
	invalidImportFile: "Este no es un archivo de exportación válido de Velair",
	importOverwriteWarning: "Al importar se sobrescribirán los valores existentes. No podrás recuperarlos salvo que hayas creado antes una exportación.",
	noImportSections: "No hay secciones importables",
	legacyImportTemperatureUnit: "Esta copia de seguridad antigua no guarda la unidad de temperatura. Velair interpretará sus temperaturas como Celsius y las convertirá a {target} cuando sea necesario.",
	notSet: "Sin definir",
	maintenance: "Mantenimiento",
	maintenanceDescription: "Detalles técnicos de versiones para diagnóstico.",
	frontendBuild: "Compilación de la interfaz",
	portableFormatVersion: "Formato de exportación",
	internalStorageVersion: "Almacenamiento/modelo",
	integrationVersion: "Versión de la integración",
	resetVelair: "Restablecer Velair",
	resetVelairDescription: "Borra todos los datos almacenados de Velair, incluidas las planificaciones, plantillas, preferencias del panel, refuerzos y pausas activas, ajustes de Comfort y Room Assist, configuración y aprendizaje de Adaptive Preconditioning y el comportamiento al arrancar. Después recrea valores predeterminados adaptados a la unidad de los termostatos gestionados actualmente.",
	confirmReset: "¿Restablecer todos los datos almacenados de Velair? No podrás deshacerlo salvo que hayas creado antes una exportación.",
	confirmResetPreconditioningLearning: "¿Reiniciar el aprendizaje adaptativo de {direction}? Se conservarán las planificaciones y los ajustes.",
	confirmResetPreconditioningSettings: "¿Restablecer los ajustes de preacondicionamiento de este termostato? Se conservarán las muestras de aprendizaje.",
	resetDone: "Datos de Velair restablecidos",
	resetting: "Restableciendo",
	minTemperature: "Temperatura mínima",
	maxTemperature: "Temperatura máxima",
	modeOptional: "Modo opcional",
	firstWeekday: "Primer día de la semana",
	managedZones: "Termostatos gestionados",
	mode: "Modo",
	moveDown: "Bajar",
	moveUp: "Subir",
	nextEvent: "Próximo evento",
	nextEvents: "Próximos eventos",
	noActiveBoosts: "No hay refuerzos activos",
	noBlocks: "No hay bloques",
	noManagedEntities: "No hay termostatos gestionados.",
	noTemplates: "No hay plantillas",
	newTemplate: "Nueva plantilla",
	noUpcomingEvent: "No hay próximos eventos",
	off: "Apagar",
	otherDays: "Otros días",
	otherThermostats: "Otros termostatos",
	overview: "Resumen",
	overviewPanelIntro: "La vista principal reúne el estado del planificador, los próximos eventos, los refuerzos activos y las acciones rápidas.",
	overviewStatusPaused: "Pausado",
	overviewStatusPausedDetail: "Pausa temporal activa",
	overviewStatusRunning: "En ejecución",
	overviewStatusRunningDetail: "El planificador está aplicando la planificación",
	overviewStatusStopped: "Detenido",
	overviewStatusStoppedDetail: "El planificador está detenido hasta que se reanude",
	overviewZones: "Resumen de zonas",
	overviewZoneApplied: "Aplicada",
	overviewZoneAir: "Aire: {status}",
	overviewZoneBoost: "Boost",
	overviewZoneComfort: "Confort: {status}",
	overviewZoneManual: "Manual",
	overviewZonePaused: "Pausada",
	overviewZonePreconditioning: "Preacondicionando",
	overviewZoneResumes: "Reanuda {time}",
	overviewZoneRoom: "Ambiente",
	overviewZoneRoomAssist: "Room Assist {delta}",
	overviewZoneScheduled: "Programada",
	overviewZoneSensorIssue: "Datos de sensores incompletos",
	overviewZoneTarget: "Objetivo",
	overviewZoneUntil: "Hasta {time}",
	overviewZoneUntilResumed: "Hasta reanudar",
	overviewZoneReadyAt: "Lista a las {time}",
	overviewZoneNextAt: "Siguiente a las {time}",
	overviewZoneAutomationOff: "Automatización desactivada",
	overviewZoneRoomAssistThermalFlow: "Flujo de temperaturas de Room Assist",
	overviewZoneSensor: "Sensor",
	overviewZoneClimate: "Termostato",
	overviewZoneTemperature: "Temperatura",
	overviewZoneSetpoint: "Consigna",
	overviewZoneScheduledSetpoint: "Programada",
	overviewZoneOffset: "Offset",
	overviewZoneRoomAssistActive: "Activo",
	overviewZoneRoomAssistHolding: "Manteniendo",
	overviewZoneComfortLabel: "Confort",
	overviewZoneAirLabel: "Aire",
	overviewZoneDataLabel: "Datos",
	pause: "Pausar",
	pauseActive: "En pausa",
	pauseApplied: "Planificador en pausa",
	pauseDuration: "Duración de la pausa (min)",
	pauseFrom: "Desde",
	pauseIndefinite: "Sin hora de fin",
	pauseRemaining: "Se reanuda en",
	pauseTo: "Hasta",
	preconditioning: "Preacondicionamiento",
	preconditioningEnabled: "Preacondicionamiento activado",
	preconditioningCool: "Refrigeración",
	preconditioningCoolingFallbackLead: "Margen inicial de refrigeración (min)",
	preconditioningDirectionSamples: "{count}/{required}",
	preconditioningHeat: "Calefacción",
	preconditioningHeatingFallbackLead: "Margen inicial de calefacción (min)",
	preconditioningDirectionStatus: "Estado",
	preconditioningExpandClimate: "Mostrar ajustes de {climate}",
	preconditioningIntroDetail: "Permite que Velair calcule cuándo debe iniciar el preacondicionamiento para que la estancia se acerque a tiempo a la temperatura programada.",
	preconditioningIntroTitle: "Anticipación adaptativa",
	preconditioningAdaptivePercentile: "Percentil dinámico de confort",
	preconditioningAdaptivePercentileHelp: "Al activarlo, aumenta el margen tras demasiados intentos parciales y lo reduce cuando los intentos se completan de forma consistente.",
	preconditioningCalculationCombined: "Combinado",
	preconditioningCalculationDetails: "Detalles del cálculo",
	preconditioningCalculationFinalLead: "Anticipación final",
	preconditioningCalculationPartialFloor: "Límite inferior de muestras parciales",
	preconditioningCalculationReachedEstimate: "Estimación con muestras completas",
	preconditioningCalculationRounded: "Redondeado",
	preconditioningCalculationSampleCounts: "Completadas: {reached} · Parciales: {partial} · Inválidas: {invalid}",
	preconditioningCalculationSamples: "Muestras",
	preconditioningComfortPercentile: "Percentil de confort",
	preconditioningComfortPercentileHelp: "Un valor mayor inicia antes usando los casos más lentos del historial; uno menor inicia más tarde con menos margen.",
	preconditioningComfortPercentileLabel: "Percentil de confort",
	preconditioningCollapseClimate: "Ocultar ajustes de {climate}",
	preconditioningFallbackInactive: "Modelo adaptativo activo",
	preconditioningFallbackLabel: "Modelo inicial",
	preconditioningFallbackLead: "{minutes} min",
	preconditioningFallbackMinutesPerDegree: "Modelo inicial",
	preconditioningFallbackMinutesPerDegreeHelp: "Un valor mayor inicia antes mientras faltan muestras; uno menor inicia más tarde.",
	preconditioningHistorySize: "Tamaño del historial",
	preconditioningHistorySizeHelp: "Un valor mayor conserva más muestras útiles; uno menor descarta antes las antiguas.",
	preconditioningHistory: "Historial",
	preconditioningInvalidEvents: "Inválidas",
	preconditioningLastSample: "Última muestra",
	preconditioningLeadTime: "{minutes} min antes",
	preconditioningLearning: "Aprendizaje local en curso",
	preconditioningLearningStatus: "Estado del aprendizaje",
	preconditioningLearningDisabled: "Aprendizaje desactivado",
	preconditioningLearningMoreData: "Faltan datos",
	preconditioningLearningReady: "Modelo listo",
	preconditioningLimitedByMax: "Limitado por el máximo",
	preconditioningLivePrediction: "Predicción actual",
	preconditioningLivePredictionHelp: "Usa el próximo bloque real para mostrar cómo cambia el inicio calculado del preacondicionamiento.",
	preconditioningMaxLead: "Anticipación máxima (min)",
	preconditioningMaxLeadHelp: "Un valor mayor permite iniciar antes; uno menor limita más la antelación.",
	preconditioningMaximumLabel: "Máximo",
	preconditioningMinimumDelta: "Diferencia mínima de temperatura",
	preconditioningMinimumDeltaHelp: "Un valor mayor hace que se ignoren diferencias más grandes; uno menor permite reaccionar ante variaciones más leves.",
	preconditioningMinStart: "Anticipación mínima (min)",
	preconditioningMinStartHelp: "Un valor mayor ignora anticipaciones cortas; uno menor permite anticipaciones más breves.",
	preconditioningModelHistory: "Historial de casos similares",
	preconditioningModel: "Modelo de aprendizaje",
	preconditioningModelInitial: "Modelo inicial",
	preconditioningModelSource: "Fuente del modelo",
	preconditioningNextBlock: "Próximo bloque",
	preconditioningNoUpcomingDirectionEvent: "No hay ningún bloque próximo de {direction} para el que calcular una predicción.",
	preconditioningNormalStart: "Inicio normal",
	preconditioningNotSupported: "No compatible",
	preconditioningPartialEvents: "Parciales",
	preconditioningPartialSamples: "Muestras parciales: {count}",
	preconditioningPartialExpiry: "Caducidad de muestras parciales (días)",
	preconditioningPartialExpiryHelp: "Un valor mayor mantiene durante más tiempo la influencia de los intentos incompletos; uno menor los descarta antes.",
	preconditioningQualityComplete: "Completa",
	preconditioningQualityInvalid: "Inválida",
	preconditioningQualityPartial: "Parcial",
	preconditioningRecencyDecay: "Pérdida de peso por antigüedad (días)",
	preconditioningRecencyDecayHelp: "Un valor mayor hace que las muestras antiguas pierdan peso más despacio; uno menor prioriza las recientes.",
	preconditioningReachedEvents: "Completadas",
	preconditioningResetLearning: "Reiniciar aprendizaje",
	preconditioningLearningResetDone: "Aprendizaje para {direction} reiniciado",
	preconditioningSimilarSamples: "Muestras similares",
	preconditioningSimilarSamplesHelp: "Un valor mayor tiene en cuenta más muestras cercanas del historial; uno menor se centra en los casos más parecidos.",
	preconditioningUnsupportedDirection: "No compatible con este termostato",
	preconditioningOutdoorTemperatureEntity: "Sensor de temperatura exterior",
	preconditioningOutdoorTemperatureEntityHelp: "Aporta el contexto exterior local al comparar muestras; no modifica el modelo inicial.",
	preconditioningOutdoorContext: "Contexto exterior",
	preconditioningOutdoorDisabled: "Desactivado",
	preconditioningSelectOutdoorSensor: "Seleccionar sensor",
	preconditioningResetSettings: "Restablecer ajustes predeterminados",
	preconditioningSettingsResetDone: "Ajustes de preacondicionamiento restablecidos",
	preconditioningStarts: "Inicio",
	preconditioningTargetBy: "Objetivo a las",
	preconditioningTiming: "Tiempos y límites",
	preconditioningUnavailable: "Termostato no disponible. No se puede activar el preacondicionamiento.",
	preconditioningUseOutdoorTemperature: "Usar temperatura exterior",
	preconditioningUseOutdoorTemperatureHelp: "Al activarlo, incluye la temperatura exterior al elegir muestras similares del historial.",
	resume: "Reanudar",
	resumed: "Planificador reanudado",
	resizeEnd: "Ajustar fin",
	resizeStart: "Ajustar inicio",
	schedulerControls: "Controles del planificador",
	schedules: "Planificación",
	sensors: "Sensor de estancia",
	roomSensorAppliedTarget: "Consigna aplicada",
	roomSensorAssist: "Control por sensor de estancia",
	roomSensorAssistBadge: "Sensor de estancia",
	roomSensorAssistEnabled: "Control por sensor de estancia activado",
	roomSensorAssistHelp: "Ajusta temporalmente la consigna del termostato para que el sensor de estancia alcance la temperatura programada.",
	roomSensorAssistDisabledDetail: "Hay un sensor de estancia seleccionado, pero el control está desactivado. Velair seguirá usando la temperatura del termostato hasta que actives este interruptor.",
	roomSensorAssistDebounce: "Retraso de actualización",
	roomSensorAssistDebounceHelp: "Segundos de espera tras cambios de temperatura de la estancia o del termostato antes de recalcular la consigna asistida. Usa 0 para actualizar inmediatamente.",
	roomSensorAssistMaxDelta: "Ajuste máximo de control",
	roomSensorAssistMaxDeltaHelp: "Un valor mayor puede mantener la válvula abierta más tiempo; uno menor limita cuánto puede ajustar Velair la consigna del termostato.",
	roomSensorAssistOffset: "Offset de control",
	roomSensorAssistOffsetHelp: "Offset temporal aplicado a la consigna del termostato para acercar la temperatura de la estancia a la programada.",
	roomSensorAssistCorrectionValue: "Offset {value}",
	roomSensorAssistCorrectionActiveHelp: "Room Assist está ajustando la consigna del termostato. Esto no indica si el termostato está calentando o enfriando activamente.",
	roomSensorAssistNoCorrection: "Offset 0 · Manteniendo",
	roomSensorAssistNoCorrectionHelp: "Room Assist no está aplicando una corrección de consigna. La temperatura de la estancia y la consigna programada aún pueden ser diferentes.",
	roomSensorBlockActiveSince: "Activo desde {time}",
	roomSensorBlockMode: "Modo: {mode}",
	roomSensorBlockScheduled: "Programado a las {time}",
	roomSensorBlockStartedEarly: "Iniciado a las {time}",
	roomSensorBlockTarget: "Objetivo: {target}",
	roomSensorGapAboveTarget: "{value} por encima del objetivo",
	roomSensorGapBelowTarget: "{value} por debajo del objetivo",
	roomSensorClimateTarget: "Consigna del termostato",
	roomSensorClimateTemperature: "Lectura del termostato",
	roomSensorCollapseClimate: "Ocultar {climate}",
	roomSensorControl: "Control por sensor de estancia",
	roomSensorExpandClimate: "Mostrar {climate}",
	roomSensorIntroDetail: "Usa un sensor de estancia para guiar la consigna del termostato mientras Velair ejecuta los bloques de temperatura programados.",
	roomSensorIntroTitle: "Control por temperatura de estancia",
	roomSensorLiveStatus: "Estado actual",
	roomSensorNoActiveBlock: "Sin bloque de temperatura activo",
	roomSensorNoActiveBlockDetail: "El control se actualizará cuando haya un bloque de temperatura programado activo.",
	roomSensorNotConfigured: "Selecciona primero un sensor de estancia",
	roomSensorRoomTemperature: "Sensor de estancia",
	roomSensorRemainingToTarget: "Diferencia hasta el objetivo",
	roomSensorRemainingValue: "Faltan {value}",
	roomSensorScheduledTarget: "Objetivo programado",
	roomSensorSelectSensor: "Seleccionar sensor de estancia",
	roomSensorStatusAssisting: "Ajustando",
	roomSensorStatusBlocked: "Bloqueado",
	roomSensorStatusDisabled: "Desactivado",
	roomSensorStatusHolding: "Manteniendo",
	roomSensorStatusIdle: "En espera",
	roomSensorStatusNotConfigured: "Sin configurar",
	roomSensorStatusReady: "Listo",
	roomSensorStatusUnavailable: "No disponible",
	roomSensorTemperatureEntity: "Sensor de temperatura de estancia",
	roomSensorTemperatureEntityHelp: "Sensor que el control usa como temperatura real de la estancia mientras ajusta la consigna del termostato.",
	roomSensorTemperatureScale: "Escala de temperaturas de Room Assist",
	roomSensorUnavailable: "Termostato no disponible",
	roomSensorValueUnavailable: "No disponible",
	save: "Guardar",
	saveTemplate: "Guardar como plantilla",
	saved: "Planificación guardada",
	saving: "Guardando",
	scheduleCopyHint: "También puedes copiar esta configuración a otro día o termostato.",
	scheduleEditor: "Editor de planificación",
	scheduleStepClimate: "1. Selecciona el termostato que quieres configurar.",
	scheduleStepConfigure: "3. Configura el termostato a tu gusto.",
	scheduleStepDay: "2. Selecciona el día que quieres configurar.",
	reorderZones: "Usa las flechas o arrastra el control para cambiar el orden de los termostatos.",
	selectedWeekday: "Día inicial",
	selectedZone: "Termostato inicial",
	selectTemplatePlaceholder: "Selecciona una plantilla",
	selectTemplateToBegin: "Selecciona una plantilla para comenzar.",
	setTemperature: "Ajustar temperatura",
	settings: "Ajustes",
	settingsPanelIntro: "Elige el orden de los termostatos y el primer día de la semana.",
	startupBehavior: "Inicio de Home Assistant",
	startsAt: "Empieza",
	applyScheduleOnStartup: "Aplicar la planificación activa al arrancar",
	applyScheduleOnStartupDescription: "Cuando Home Assistant arranque, Velair puede aplicar el bloque programado vigente a los termostatos gestionados en lugar de dejarlos como estén.",
	start: "Hora",
	status: "Estado",
	stop: "Detener",
	supportedFanModes: "Modos de ventilador",
	supportedHorizontalSwingModes: "Modos de oscilación horizontal",
	supportedPresetModes: "Preajustes",
	supportedSwingModes: "Oscilación",
	presetMode: "Preajuste",
	swingMode: "Oscilación",
	temp: "Temp.",
	temperatureRange: "Rango de temperatura",
	temperatureUnit: "Unidad de temperatura",
	temperatureUnitManagedByHomeAssistant: "Detectada en Home Assistant. Para cambiarla, modifica el sistema de unidades de Home Assistant.",
	temperatureMigrationRequired: "Velair necesita tu atención",
	temperatureMigrationStopped: "El planificador y la configuración térmica están bloqueados porque Home Assistant ha cambiado de unidad. Abre los ajustes de Velair para migrar los datos con seguridad.",
	temperatureMigrationQuestion: "¿Migrar las temperaturas guardadas de {source} a {target}?",
	temperatureMigrationExplanation: "Continúa solo si todas las temperaturas guardadas por Velair siguen estando en {source}. La migración actualiza planificaciones, plantillas, anulaciones, Comfort, Room Assist, ajustes y ritmos de calentamiento y enfriamiento, además de los datos de aprendizaje de Adaptive Preconditioning, antes de reanudar el planificador. Si algún valor guardado ya está en {target}, la migración lo dejará incorrecto.",
	temperatureMigrationUse: "Migrar de {source} a {target}",
	temperatureMigrationConfirm: "¿Confirmas que todos los datos de temperatura guardados por Velair están en {source} y quieres convertirlos a {target}? No continúes si algún valor ya está en {target}, porque quedará incorrecto. El planificador seguirá detenido si la migración no puede guardarse.",
	temperatureMigrationComplete: "Datos de temperatura actualizados y planificador reanudado",
	temperatureMigrationFailed: "No se han podido actualizar los datos de temperatura",
	temperatureLegacyResetQuestion: "¿Restablecer los datos antiguos en Celsius para usar {target}?",
	temperatureLegacyResetExplanation: "Esta instalación se creó con una versión de Velair que solo guardaba valores en Celsius. Como Home Assistant ahora usa {target}, restablece Velair para borrar los datos anteriores y crear valores predeterminados seguros para esa unidad. Los futuros cambios de unidad de Home Assistant sí ofrecerán una conversión completa de los datos.",
	temperatureLegacyResetStopped: "El planificador está detenido porque esta instalación antigua contiene datos solo en Celsius mientras Home Assistant usa Fahrenheit. Abre los ajustes de Velair y usa Restablecer Velair para crear valores predeterminados en Fahrenheit.",
	temperatureStep: "Paso",
	temperatureStepNotReported: "No proporcionado por Home Assistant",
	temperatureStepNotReportedDescription: "Esta entidad climate no proporciona el atributo target_temp_step. Velair no intenta deducir el paso de temperatura.",
	targetTemp: "Temp. objetivo",
	targetHumidity: "Humedad objetivo",
	targetBy: "Objetivo a las",
	targetTemperature: "Temperatura objetivo",
	todayTimeline: "Línea temporal de hoy",
	updateTemplate: "Actualizar plantilla",
	templateDeleted: "Plantilla eliminada",
	templateNameRequired: "El nombre de la plantilla es obligatorio",
	templateOptionalHint: "Selecciona una plantilla o configura manualmente la planificación.",
	templateSaved: "Plantilla guardada",
	templates: "Plantillas",
	thermostat: "Termostato",
	templatesPanelIntro: "Crea y reutiliza plantillas sin sobrecargar el editor de planificación.",
	time: "Hora",
	timeline: "Línea temporal",
	title: "Título",
	unableApplyThermostats: "No se pudo aplicar la planificación a los termostatos",
	unableCopy: "No se pudo copiar la planificación",
	unableLoad: "No se pudieron cargar los datos",
	unablePause: "No se pudo pausar el planificador",
	unableResume: "No se pudo reanudar el planificador",
	unableReset: "No se pudieron restablecer los datos de Velair",
	unableSave: "No se pudo guardar la planificación",
	unableSaveSettings: "No se pudieron guardar los ajustes",
	unableDeleteTemplate: "No se pudo eliminar la plantilla",
	unableExport: "No se pudieron exportar los datos",
	unableSaveTemplate: "No se pudo guardar la plantilla",
	unableSubscribe: "No se pudo suscribir a las actualizaciones",
	unsupportedModeForClimate: "{entity} no es compatible con el modo {mode} a las {start}. Cambia ese bloque a Mantener o elige un modo compatible antes de aplicar.",
	unsaved: "sin guardar",
	waiting: "Esperando datos de planificación",
	zoneOrder: "Orden de termostatos",
	zonesManaged: "Zonas gestionadas: {count}",
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
		paused: "Pausado"
	},
	hvacModes: {
		auto: "Automático",
		cool: "Frío",
		dry: "Deshumidificación",
		fan_only: "Ventilador",
		heat: "Calor",
		heat_cool: "Calor/frío",
		off: "Apagado"
	},
	hvacActions: {
		cooling: "Enfriando",
		drying: "Deshumidificando",
		fan: "Ventilando",
		heating: "Calentando",
		idle: "En espera",
		off: "Apagado",
		preheating: "Precalentando",
		defrosting: "Desescarchando"
	}
}, lt = /* @__PURE__ */ t({ fr: () => ut }), ut = {
	addBlock: "Ajouter un bloc",
	apply: "Appliquer",
	cloneDayToDays: "Copier ce jour vers",
	cloneDayToThermostats: "Copier ce jour vers",
	cloneAction: "Copier",
	appliedDays: "Copié vers {count} jour{suffix}",
	appliedTemplateTargets: "Appliqué à {count} cibles",
	appliedThermostats: "Copié vers {count} thermostat{suffix}",
	applying: "Application en cours",
	applyTemplate: "Appliquer le modèle",
	applyTo: "Appliquer à",
	applyToAction: "Appliquer à...",
	applyTemplateTo: "Appliquer {template} à...",
	boost: "Forçage",
	boostActive: "Forçage actif",
	activeBoosts: "Forçages actifs",
	availableModes: "Modes disponibles",
	boostTarget: "Consigne du forçage",
	boostUntil: "Se termine dans",
	blocks: "Plages",
	build: "Build",
	cardView: "Vue de la carte",
	activeSetupCardControls: "Commandes de configuration active",
	activeSetupCardControlsBoth: "Modes et profils",
	activeSetupCardControlsDescription: "Choisissez ce que cette carte peut modifier. Le mode actuel et les profils appliqués restent visibles.",
	activeSetupCardControlsModes: "Modes uniquement",
	activeSetupCardControlsProfiles: "Profils uniquement",
	cardViewOverviewBoosts: "Vue d’ensemble : forçages actifs",
	cardViewOverviewEvents: "Vue d’ensemble : prochains événements",
	cardViewOverviewStatus: "Vue d’ensemble : état du planificateur",
	cardViewOverviewTimeline: "Vue d’ensemble : programme du jour",
	cardViewOverviewZones: "Vue d’ensemble : zones",
	cardViewActiveSetup: "Profils : configuration active",
	cardViewSchedules: "Programmes : éditeur",
	cardViewSensors: "Room Assist : configuration et état",
	cardViewComfort: "Confort : configuration et état",
	cardViewPreconditioning: "Anticipation : configuration et état",
	cardThermostatHidden: "Masqué sur cette carte",
	cardThermostatVisible: "Affiché sur cette carte",
	cardThermostats: "Thermostats de cette carte",
	cardThermostatsDescription: "Choisissez les thermostats affichés sur cette carte et leur ordre.",
	comfortCardVisibility: "Affichage de la carte Confort",
	comfortCardVisibilityDescription: "Choisissez les réglages et graphiques Confort affichés sur cette carte.",
	comfortCardShowCo2: "Afficher le graphique du CO2",
	comfortCardShowConfiguration: "Afficher la configuration",
	comfortCardShowHumidity: "Afficher le graphique d’humidité",
	comfortCardShowTemperature: "Afficher le graphique de température",
	roomAssistCardVisibility: "Affichage de Room Assist",
	roomAssistCardVisibilityDescription: "Choisissez les commandes et détails d’état de Room Assist affichés sur cette carte.",
	roomAssistShowDebounce: "Afficher le délai d’actualisation",
	roomAssistShowLiveStatus: "Afficher l’état en direct",
	roomAssistShowMaxDelta: "Afficher l’écart maximal d’assistance",
	roomAssistShowSensor: "Afficher le capteur de température ambiante",
	roomAssistShowSwitch: "Afficher l’interrupteur marche/arrêt",
	current: "Actuel",
	currentHumidity: "Humidité",
	currentTemperature: "Température actuelle",
	currentTime: "Heure actuelle : {time}",
	clear: "Effacer",
	confirmDeleteTemplate: "Supprimer le modèle {template} ?",
	confirmTemplate: "Remplacer {weekday} par {template} ?",
	comfort: "Confort",
	comfortAirQuality: "Qualité de l’air",
	comfortAirQualityElevated: "CO2 élevé",
	comfortAirQualityGood: "Bon air",
	comfortAirQualityPoor: "Mauvaise qualité de l’air",
	comfortAirQualityUnavailable: "CO2 indisponible",
	comfortAutomaticSourceValue: "Automatique : {entity}",
	comfortCo2: "CO2",
	comfortCo2Attention: "Élevé",
	comfortCo2Limits: "Seuils de CO2",
	comfortCo2LimitsHelp: "Le niveau élevé signale une première alerte. Le niveau mauvais indique une concentration de CO2 plus préoccupante.",
	comfortCo2Poor: "Mauvais",
	comfortCo2Sensor: "Capteur de CO2",
	comfortCollapseClimate: "Réduire {climate}",
	comfortConditionCold: "Froid",
	comfortConditionColdAndDry: "Froid et sec",
	comfortConditionColdAndHumid: "Froid et humide",
	comfortConditionComfortable: "Confortable",
	comfortConditionDry: "Air sec",
	comfortConditionHot: "Chaud",
	comfortConditionHotAndDry: "Chaud et sec",
	comfortConditionHotAndHumid: "Chaud et humide",
	comfortConditionHumid: "Humide",
	comfortConditionHumidityComfortable: "Humidité dans la plage",
	comfortConditionMonitoringOff: "Surveillance désactivée",
	comfortConditionNoReadings: "Aucune mesure",
	comfortConditionReadingsOutdated: "Mesures obsolètes",
	comfortConditionTemperatureComfortable: "Température dans la plage",
	comfortCooler: "Plus frais",
	comfortCurrentReadings: "Mesures actuelles",
	comfortDataFreshness: "Fraîcheur des données",
	comfortDataIssueCo2Missing: "CO2 indisponible",
	comfortDataIssueCo2Stale: "Mesure de CO2 obsolète",
	comfortDataIssueHumidityMissing: "Humidité indisponible",
	comfortDataIssueHumidityStale: "Mesure d’humidité obsolète",
	comfortDataIssueTemperatureMissing: "Température indisponible",
	comfortDataIssueTemperatureStale: "Mesure de température obsolète",
	comfortDataPartial: "Mesures partielles",
	comfortDataStale: "Mesures obsolètes",
	comfortDataUnavailable: "Aucune mesure exploitable",
	comfortDisabledDetail: "La surveillance du confort est désactivée pour ce thermostat. Aucun capteur de confort n’est suivi.",
	comfortDoNotMonitor: "Ne pas surveiller le CO2",
	comfortDoNotMonitorHumidity: "Ne pas surveiller l’humidité",
	comfortDrier: "Plus sec",
	comfortExpandClimate: "Développer {climate}",
	comfortHumidity: "Humidité",
	comfortHumidityRange: "Plage d’humidité",
	comfortHumidityRangeHelp: "Une plage étroite avertit plus tôt ; une plage large est plus tolérante.",
	comfortHumiditySensor: "Capteur d’humidité",
	comfortIntroDetail: "Surveillez localement la température, l’humidité et le CO2, puis utilisez les événements Velair dans vos automatisations Home Assistant.",
	comfortIntroTitle: "Confort ambiant",
	comfortMaximum: "Max",
	comfortMinimum: "Min",
	comfortMoreHumid: "Plus humide",
	comfortMapCurrentPosition: "Position actuelle : {temperature}, {humidity}",
	comfortNotMonitored: "Non surveillé",
	comfortSelectSensor: "Utiliser la source automatique",
	comfortStaleAfter: "Obsolète après",
	comfortStaleAfterHelp: "Âge maximal depuis la dernière mise à jour d’état dans Home Assistant. Une valeur élevée conserve les anciennes mesures plus longtemps.",
	comfortTargetZone: "Plage de confort",
	comfortTemperature: "Température",
	comfortTemperatureRange: "Plage de température",
	comfortTemperatureRangeHelp: "Une plage étroite avertit plus tôt ; une plage large est plus tolérante.",
	comfortTemperatureSensor: "Capteur de température",
	comfortUnavailable: "Thermostat indisponible",
	comfortWarmer: "Plus chaud",
	createTemplate: "Créer un modèle",
	customTemplateName: "Nom du modèle",
	day: "Jour",
	daySchedule: "Programme du jour",
	defaultZone: "Première zone gérée",
	deleteBlock: "Supprimer la plage",
	deleteTemplate: "Supprimer le modèle",
	dismiss: "Fermer",
	duplicateStart: "Heure de début en double : {start}",
	entityDiagnosticMissing: "Entité introuvable",
	entityDiagnosticNoModes: "Aucun mode HVAC pris en charge signalé",
	entityDiagnosticNoRange: "Aucune plage de température signalée",
	entityDiagnosticNotClimate: "Cette entité n’est pas de type climate",
	entityDiagnosticOk: "La configuration du thermostat semble correcte",
	fanMode: "Mode du ventilateur",
	horizontalSwingMode: "Oscillation horizontale",
	invalidStart: "Heure de début invalide : {start}",
	invalidTemperature: "Température invalide pour {start}",
	invalidTemperatureRange: "Utilisez une valeur entre {min} et {max}",
	invalidTemperatureStep: "Utilisez des pas de {step}",
	incompatibleScheduleTargets: "Certaines consignes doivent être vérifiées",
	incompatibleScheduleTargetsDescription: "{count} consigne(s) enregistrée(s) ne correspondent plus à la plage ou au pas du thermostat. Ouvrez Programmes et enregistrez une valeur compatible.",
	operationRecoveryRequired: "Velair a enregistré les données, mais n’a pas pu reprendre",
	operationRecoveryDescription: "La planification reste arrêtée. Rechargez l’intégration Velair ou redémarrez Home Assistant pour terminer la récupération.",
	operationCancelled: "L’opération a été annulée",
	operationCurrentZone: "Traitement de {zone}",
	operationDefaultCompleted: "Programmes par défaut restaurés",
	operationDefaultFailed: "Impossible de restaurer les programmes par défaut",
	operationDefaultPartial: "Programmes par défaut restaurés avec des problèmes",
	operationDefaultRunning: "Restauration des programmes par défaut",
	operationDismiss: "Fermer l’état de l’opération",
	operationFailedHelp: "Consultez le thermostat concerné et les journaux de Home Assistant",
	operationFailureCount: "{count} zones rencontrent des problèmes : {zones}",
	operationFailureOne: "1 zone rencontre des problèmes : {zones}",
	operationModeCompleted: "Mode {target} appliqué",
	operationModeFailed: "Impossible d’appliquer le mode {target}",
	operationModePartial: "Mode {target} appliqué avec des problèmes",
	operationModeRunning: "Application du mode {target}",
	operationNoZones: "Aucune zone à modifier",
	operationProfileCompleted: "Profil {target} appliqué",
	operationProfileFailed: "Impossible d’appliquer le profil {target}",
	operationProfilePartial: "Profil {target} appliqué avec des problèmes",
	operationProfileRunning: "Application du profil {target}",
	operationProgress: "{completed} zones sur {total} traitées",
	operationProgressLabel: "Progression de l’opération Velair",
	keep: "Conserver",
	keepMode: "Conserver le mode",
	tagline: "Une automatisation du climat qui s’adapte à votre quotidien.",
	loading: "Chargement des données du planificateur...",
	loadingEntities: "Chargement des zones gérées...",
	managedEntityAvailable: "Disponible",
	managedEntityMissing: "Introuvable",
	managedEntitiesStatus: "Thermostats gérés",
	menu: "Menu",
	minutesShort: "min",
	secondsShort: "s",
	providedData: "Données fournies",
	profiles: "Profils",
	profilesAndModes: "Profils et modes",
	activeSetup: "Configuration active",
	activeSetupDescription: "Consultez ce qui contrôle actuellement vos zones et modifiez-le depuis un seul endroit.",
	activeSetupChange: "Modifier",
	activeSetupModesHelp: "Choisissez le mode qui doit contrôler les profils actifs.",
	activeSetupAppliedProfiles: "Profils appliqués",
	activeSetupNoProfiles: "Aucun profil appliqué. Les zones suivent leurs programmes par défaut.",
	activeSetupManualProfile: "Activer un profil manuellement",
	activeSetupManualProfileHelp: "Cette action remplace tous les profils actifs et passe en mode Manuel. Pour activer plusieurs profils ensemble, utilisez un mode.",
	profilesPanelIntro: "Les profils définissent d’autres routines climatiques. Les modes activent un ou plusieurs profils ensemble.",
	profileLibrarySelectorLabel: "Bibliothèques de profils et de modes",
	profilesLibraryDescription: "Définissez le comportement des zones sélectionnées.",
	profilesDescription: "Un profil définit le comportement d’une ou plusieurs zones lorsqu’il est actif.",
	profileActive: "Profil actif",
	profilesActive: "Profils actifs",
	profileActivate: "Activer le profil",
	profileBehaviorDefault: "Programme par défaut",
	profileBehaviorPause: "Suspendre le programme",
	profileBehaviorSchedule: "Programme du profil",
	profileBlockAction: "Action",
	profileBrowseIcons: "Parcourir les icônes disponibles",
	profileConfirmDelete: "Supprimer {profile} et tous ses réglages de zone ? Cette action est irréversible.",
	profileConfirmDeleteActive: "{profile} est actif. Le supprimer et rétablir le programme par défaut de ses zones ? Les autres profils actifs seront conservés. Cette action est irréversible.",
	profileColor: "Couleur du profil",
	profileColorHelp: "Permet d’identifier ce profil dans les sélecteurs et les listes.",
	profileCopyTemplate: "Copier le modèle vers ce jour",
	profileCreate: "Nouveau profil",
	profileDelete: "Supprimer le profil",
	profileDeleted: "Profil supprimé",
	profileDescription: "Description",
	profileDescriptionCharactersRemaining: "{count} caractères restants",
	profileDescriptionTooLong: "La description doit contenir au maximum {count} caractères.",
	profileDiscardChanges: "Abandonner les modifications non enregistrées du profil ?",
	profileCollapseClimate: "Réduire {climate}",
	profileExpandClimate: "Développer {climate}",
	profileIcon: "Icône",
	profileIconHelp: "Utilisez une clé Material Design Icons, par exemple mdi:briefcase-outline.",
	profileActiveContext: "Contexte climatique actif",
	modeBuiltInHelp: "Les modes intégrés ne peuvent être ni renommés ni supprimés.",
	modeInformation: "À propos de {mode}",
	modeChooseProfile: "Choisir un profil",
	modeConfirmDelete: "Supprimer le mode {mode} ? Cette action est irréversible.",
	modeCreate: "Nouveau mode",
	modeDelete: "Supprimer le mode",
	modeDeleted: "Mode supprimé",
	modeDiscardChanges: "Abandonner les modifications non enregistrées du mode ?",
	modeDefault: "Par défaut",
	modeDefaultDescription: "Désactive les profils et rétablit le programme par défaut de chaque zone.",
	modeManual: "Manuel",
	modeManualDescription: "Les profils actifs ne sont contrôlés par aucun mode.",
	modeCustomDescription: "Active les profils associés : {profile}.",
	modeChange: "Changer de mode",
	modeLabel: "Mode",
	modeMappedProfile: "Profil associé : {profile}",
	modeMappedProfileMissing: "Profil associé indisponible : {profile}",
	modeMappedProfiles: "Profils associés : {profiles}",
	modeName: "Nom du mode",
	modeNameDuplicate: "Utilisez un nom de mode unique.",
	modeNameHelp: "Cette valeur apparaît dans le sélecteur de mode de Home Assistant.",
	modeNameRequired: "Le nom du mode est obligatoire.",
	modeNameTooLong: "Le nom du mode doit contenir au maximum {count} caractères.",
	modeProfile: "Profil associé",
	modeProfiles: "Profils associés",
	modeProfileHelp: "Ce mode active tous les profils sélectionnés. Une zone ne peut appartenir qu’à un seul d’entre eux.",
	modeProfileRequired: "Sélectionnez au moins un profil et évitez les profils qui configurent la même zone.",
	modeSaved: "Mode enregistré",
	modeSelectToBegin: "Sélectionnez un mode personnalisé à modifier ou créez-en un",
	modeUnableDelete: "Impossible de supprimer le mode",
	modeUnableActivate: "Impossible de changer de mode",
	modeUnableSave: "Impossible d’enregistrer le mode",
	modesDescription: "Un mode active un ou plusieurs profils ensemble depuis Velair ou Home Assistant.",
	modesLibraryDescription: "Activez un ou plusieurs profils ensemble.",
	modesEntityNote: "Les automatisations peuvent sélectionner un mode avec select.velair_mode ou activer un profil avec velair.activate_profile et son ID d’automatisation.",
	modesTitle: "Modes",
	profilesActiveCount: "{count} profils actifs",
	profileId: "ID d’automatisation",
	profileIdReadonlyHelp: "Identifiant stable en lecture seule utilisé par les automatisations et les services.",
	profileInvalidIcon: "Utilisez une clé valide au format mdi:nom-icone.",
	profileInvalidColor: "Choisissez une couleur valide au format #RRGGBB.",
	profileInvalidSchedule: "Vérifiez que chaque plage possède une heure et une température valides et uniques.",
	profileName: "Nom du profil",
	profileNameRequired: "Le nom du profil est obligatoire",
	profileNewName: "Nouveau profil",
	profileNoDescription: "Aucune description",
	profileNoneCreated: "Aucun profil",
	profileDefaultDescription: "Chaque zone utilise son programme par défaut.",
	profileOverviewLabel: "Profil",
	profilePauseAction: "Pendant la pause",
	profilePauseKeep: "Ne pas modifier le thermostat",
	profilePauseTurnOff: "Éteindre le thermostat",
	profileRemovedElsewhere: "Ce profil a été supprimé ailleurs. Sélectionnez ou créez un autre profil.",
	profileSaved: "Profil enregistré",
	profileSelectToBegin: "Sélectionnez un profil à modifier",
	profileUnableActivate: "Impossible d’activer le profil",
	profileUnableDelete: "Impossible de supprimer le profil",
	profileZoneBehavior: "Comportement de la zone",
	portability: "Portabilité",
	portabilityDescription: "Exportez ou importez les données Velair dans un fichier JSON versionné.",
	portabilityFileReady: "{file} prêt",
	portabilityIncluded: "Inclus",
	portabilitySettingsSection: "Réglages",
	portabilityTemplatesSection: "Modèles",
	portabilityZonesSection: "Programmes des thermostats",
	portabilityPreconditioningLearningSection: "Apprentissage de l’anticipation",
	portabilityProfilesSection: "Profils climatiques",
	portabilityModesSection: "Modes",
	preconditioningImportSkipped: "Apprentissage de l’anticipation ignoré ({count}). Ces thermostats ne sont pas gérés ici : {entities}",
	portableExported: "Fichier d’exportation créé",
	portableImported: "Importation terminée",
	importData: "Importer",
	importFile: "Fichier à importer",
	chooseFile: "Choisir un fichier",
	climateOptions: "Options du thermostat",
	climateOptionsAdd: "Ajouter des réglages facultatifs",
	noFileSelected: "Aucun fichier sélectionné",
	exportData: "Exporter",
	invalidImportFile: "Ce fichier d’exportation Velair n’est pas valide",
	importOverwriteWarning: "L’importation remplacera les valeurs existantes. Elles ne pourront être récupérées que si vous les avez exportées auparavant.",
	noImportSections: "Aucune section importable trouvée",
	legacyImportTemperatureUnit: "Cette ancienne sauvegarde ne précise pas l’unité de température. Velair considérera les valeurs en degrés Celsius et les convertira en {target} si nécessaire.",
	notSet: "Non défini",
	maintenance: "Maintenance",
	maintenanceDescription: "Détails techniques des versions pour le dépannage.",
	frontendBuild: "Build du frontend",
	portableFormatVersion: "Format portable/d’exportation",
	internalStorageVersion: "Stockage/modèle",
	integrationVersion: "Version de l’intégration",
	resetVelair: "Réinitialiser Velair",
	resetVelairDescription: "Supprime toutes les données Velair enregistrées : programmes, modèles, préférences du panneau, forçages et pauses actifs, réglages de Confort, Room Assist et Anticipation adaptative, apprentissage et comportement au démarrage. Des valeurs par défaut adaptées à l’unité sont ensuite recréées pour les thermostats gérés.",
	confirmReset: "Réinitialiser toutes les données Velair ? Cette action est irréversible, sauf si vous les avez exportées auparavant.",
	confirmResetPreconditioningLearning: "Réinitialiser l’apprentissage de l’anticipation pour {direction} ? Les programmes et réglages seront conservés.",
	confirmResetPreconditioningSettings: "Rétablir les réglages d’anticipation par défaut de ce thermostat ? Les échantillons d’apprentissage seront conservés.",
	resetDone: "Données Velair réinitialisées",
	resetting: "Réinitialisation",
	minTemperature: "Température minimale",
	maxTemperature: "Température maximale",
	modeOptional: "Mode facultatif",
	firstWeekday: "Premier jour de la semaine",
	managedZones: "Zones gérées",
	mode: "Mode",
	moveDown: "Descendre",
	moveUp: "Monter",
	nextEvent: "Prochain événement",
	nextEvents: "Prochains événements",
	noActiveBoosts: "Aucun forçage actif",
	noBlocks: "Aucune plage",
	noManagedEntities: "Aucune entité climate gérée trouvée.",
	noTemplates: "Aucun modèle",
	newTemplate: "Nouveau modèle",
	noUpcomingEvent: "Aucun événement à venir",
	off: "Arrêt",
	otherDays: "Autres jours",
	otherThermostats: "Autres thermostats",
	overview: "Vue d’ensemble",
	overviewPanelIntro: "La vue principale regroupe l’état du planificateur, les prochains événements, les forçages actifs et les actions rapides.",
	overviewStatusPaused: "En pause",
	overviewStatusPausedDetail: "Pause temporaire active",
	overviewStatusRunning: "En cours",
	overviewStatusRunningDetail: "Le planificateur applique les programmes",
	overviewStatusStopped: "Arrêté",
	overviewStatusStoppedDetail: "Le planificateur est arrêté jusqu’à sa reprise",
	overviewZones: "Vue d’ensemble des zones",
	overviewZoneApplied: "Appliquée",
	overviewZoneAir: "Air : {status}",
	overviewZoneBoost: "Forçage",
	overviewZoneComfort: "Confort : {status}",
	overviewZoneManual: "Manuel",
	overviewZonePaused: "En pause",
	overviewZonePreconditioning: "Anticipation",
	overviewZoneResumes: "Reprend à {time}",
	overviewZoneRoom: "Pièce",
	overviewZoneRoomAssist: "Room Assist {delta}",
	overviewZoneScheduled: "Programmé",
	overviewZoneSensorIssue: "Données de capteur incomplètes",
	overviewZoneTarget: "Consigne",
	overviewZoneUntil: "Jusqu’à {time}",
	overviewZoneUntilResumed: "Jusqu’à la reprise",
	overviewZoneReadyAt: "Prêt à {time}",
	overviewZoneNextAt: "Suivant à {time}",
	overviewZoneAutomationOff: "Automatisation arrêtée",
	overviewZoneRoomAssistThermalFlow: "Évolution de température Room Assist",
	overviewZoneSensor: "Capteur",
	overviewZoneClimate: "Thermostat",
	overviewZoneTemperature: "Température",
	overviewZoneSetpoint: "Consigne",
	overviewZoneScheduledSetpoint: "Programmée",
	overviewZoneOffset: "Décalage",
	overviewZoneRoomAssistActive: "Actif",
	overviewZoneRoomAssistHolding: "Maintien",
	overviewZoneComfortLabel: "Confort",
	overviewZoneAirLabel: "Air",
	overviewZoneDataLabel: "Données",
	pause: "Mettre en pause",
	pauseActive: "En pause",
	pauseApplied: "Planificateur en pause",
	pauseDuration: "Durée de la pause (min)",
	pauseFrom: "De",
	pauseIndefinite: "Sans heure de fin",
	pauseRemaining: "Reprend dans",
	pauseTo: "À",
	preconditioning: "Anticipation",
	preconditioningEnabled: "Anticipation activée",
	preconditioningCool: "Refroidissement",
	preconditioningCoolingFallbackLead: "Anticipation de secours du refroidissement (min)",
	preconditioningDirectionSamples: "{count}/{required}",
	preconditioningHeat: "Chauffage",
	preconditioningHeatingFallbackLead: "Anticipation de secours du chauffage (min)",
	preconditioningDirectionStatus: "État",
	preconditioningExpandClimate: "Développer {climate}",
	preconditioningIntroDetail: "Laissez Velair calculer quand démarrer une consigne de confort programmée afin que la pièce soit plus proche de la température souhaitée à l’heure prévue.",
	preconditioningIntroTitle: "Anticipation adaptative du confort",
	preconditioningAdaptivePercentile: "Percentile de confort dynamique",
	preconditioningAdaptivePercentileHelp: "Une fois activé, il augmente la marge après trop de tentatives partielles et la réduit lorsque les tentatives réussissent régulièrement.",
	preconditioningCalculationCombined: "Combiné",
	preconditioningCalculationDetails: "Détails du calcul",
	preconditioningCalculationFinalLead: "Anticipation finale",
	preconditioningCalculationPartialFloor: "Seuil minimal partiel",
	preconditioningCalculationReachedEstimate: "Estimation atteinte",
	preconditioningCalculationRounded: "Arrondi",
	preconditioningCalculationSampleCounts: "Atteints : {reached} · Partiels : {partial} · Invalides : {invalid}",
	preconditioningCalculationSamples: "Échantillons",
	preconditioningComfortPercentile: "Percentile de confort",
	preconditioningComfortPercentileHelp: "Une valeur élevée démarre plus tôt à partir des cas appris les plus lents ; une valeur faible réduit la marge.",
	preconditioningComfortPercentileLabel: "Percentile de confort",
	preconditioningCollapseClimate: "Réduire {climate}",
	preconditioningFallbackInactive: "Modèle adaptatif actif",
	preconditioningFallbackLabel: "Valeur de secours",
	preconditioningFallbackLead: "{minutes} min",
	preconditioningFallbackMinutesPerDegree: "Modèle initial",
	preconditioningFallbackMinutesPerDegreeHelp: "Une valeur élevée démarre plus tôt avant que l’apprentissage soit suffisant ; une valeur faible démarre plus tard.",
	preconditioningHistorySize: "Taille de l’historique",
	preconditioningHistorySizeHelp: "Une valeur élevée conserve davantage d’échantillons utiles ; une valeur faible oublie plus vite les anciens.",
	preconditioningHistory: "Historique",
	preconditioningInvalidEvents: "Invalides",
	preconditioningLastSample: "Dernier échantillon",
	preconditioningLeadTime: "{minutes} min plus tôt",
	preconditioningLearning: "Apprentissage local",
	preconditioningLearningStatus: "État de l’apprentissage",
	preconditioningLearningDisabled: "Apprentissage désactivé",
	preconditioningLearningMoreData: "Données supplémentaires nécessaires",
	preconditioningLearningReady: "Apprentissage prêt",
	preconditioningLimitedByMax: "Limité par le maximum",
	preconditioningLivePrediction: "Prévision en direct",
	preconditioningLivePredictionHelp: "Utilise la prochaine plage réelle pour montrer l’évolution du démarrage anticipé calculé.",
	preconditioningMaxLead: "Anticipation maximale (min)",
	preconditioningMaxLeadHelp: "Une valeur élevée autorise un démarrage plus tôt ; une valeur faible limite davantage l’anticipation.",
	preconditioningMaximumLabel: "Maximum",
	preconditioningMinimumDelta: "Écart de température minimal",
	preconditioningMinimumDeltaHelp: "Une valeur élevée ignore davantage de petits écarts ; une valeur faible réagit aux différences plus faibles.",
	preconditioningMinStart: "Démarrage minimal (min)",
	preconditioningMinStartHelp: "Une valeur élevée ignore les anticipations courtes ; une valeur faible autorise des démarrages légèrement avancés.",
	preconditioningModelHistory: "Historique similaire",
	preconditioningModel: "Modèle d’apprentissage",
	preconditioningModelInitial: "Modèle initial",
	preconditioningModelSource: "Source du modèle",
	preconditioningNextBlock: "Prochaine plage",
	preconditioningNoUpcomingDirectionEvent: "Aucune plage {direction} à venir à prévoir.",
	preconditioningNormalStart: "Démarrage normal",
	preconditioningNotSupported: "Non pris en charge",
	preconditioningPartialEvents: "Partiels",
	preconditioningPartialSamples: "{count} partiels",
	preconditioningPartialExpiry: "Expiration des partiels (jours)",
	preconditioningPartialExpiryHelp: "Une valeur élevée prolonge l’influence des tentatives incomplètes ; une valeur faible les expire plus tôt.",
	preconditioningQualityComplete: "Complet",
	preconditioningQualityInvalid: "Invalide",
	preconditioningQualityPartial: "Partiel",
	preconditioningRecencyDecay: "Déclin temporel (jours)",
	preconditioningRecencyDecayHelp: "Une valeur élevée réduit plus lentement le poids des anciens échantillons ; une valeur faible favorise les comportements récents.",
	preconditioningReachedEvents: "Atteints",
	preconditioningResetLearning: "Réinitialiser l’apprentissage",
	preconditioningLearningResetDone: "Apprentissage {direction} réinitialisé",
	preconditioningSimilarSamples: "Échantillons similaires",
	preconditioningSimilarSamplesHelp: "Une valeur élevée prend en compte davantage d’historique proche ; une valeur faible se concentre sur les cas les plus proches.",
	preconditioningUnsupportedDirection: "Non pris en charge par ce thermostat",
	preconditioningOutdoorTemperatureEntity: "Capteur de température extérieure",
	preconditioningOutdoorTemperatureEntityHelp: "Fournit le contexte extérieur local pour comparer les échantillons appris, sans modifier le modèle initial.",
	preconditioningOutdoorContext: "Contexte extérieur",
	preconditioningOutdoorDisabled: "Désactivé",
	preconditioningSelectOutdoorSensor: "Sélectionner un capteur",
	preconditioningResetSettings: "Rétablir les réglages par défaut",
	preconditioningSettingsResetDone: "Réglages d’anticipation restaurés",
	preconditioningStarts: "Démarre",
	preconditioningTargetBy: "Consigne à atteindre à",
	preconditioningTiming: "Délais et limites",
	preconditioningUnavailable: "Thermostat indisponible. L’anticipation ne peut pas être activée.",
	preconditioningUseOutdoorTemperature: "Utiliser la température extérieure",
	preconditioningUseOutdoorTemperatureHelp: "Une fois activé, la température extérieure est prise en compte pour choisir des échantillons appris similaires.",
	resume: "Reprendre",
	resumed: "Planificateur relancé",
	resizeEnd: "Ajuster la fin",
	resizeStart: "Ajuster le début",
	schedulerControls: "Commandes du planificateur",
	schedules: "Programmes",
	sensors: "Room Assist",
	roomSensorAppliedTarget: "Consigne appliquée",
	roomSensorAssist: "Assistance du capteur ambiant",
	roomSensorAssistBadge: "Room Assist",
	roomSensorAssistEnabled: "Assistance du capteur ambiant activée",
	roomSensorAssistHelp: "Ajuste temporairement la consigne du thermostat afin que le capteur ambiant puisse atteindre la température programmée.",
	roomSensorAssistDisabledDetail: "Un capteur ambiant est sélectionné, mais Room Assist est désactivé. Velair continue d’utiliser la température du thermostat jusqu’à son activation.",
	roomSensorAssistDebounce: "Délai d’actualisation",
	roomSensorAssistDebounceHelp: "Délai en secondes après un changement de température ambiante ou du thermostat avant de recalculer la consigne assistée. Utilisez 0 pour une mise à jour immédiate.",
	roomSensorAssistMaxDelta: "Écart d’assistance maximal",
	roomSensorAssistMaxDeltaHelp: "Une valeur élevée peut maintenir la vanne ouverte plus longtemps ; une valeur faible limite l’ajustement de la consigne par Velair.",
	roomSensorAssistOffset: "Décalage d’assistance",
	roomSensorAssistOffsetHelp: "Décalage temporaire de la consigne du thermostat pour aider la température ambiante à se rapprocher de la température programmée.",
	roomSensorAssistCorrectionValue: "Décalage {value}",
	roomSensorAssistCorrectionActiveHelp: "Room Assist ajuste la consigne du thermostat. Cela n’indique pas si celui-ci chauffe ou refroidit activement.",
	roomSensorAssistNoCorrection: "Décalage 0 · Maintien",
	roomSensorAssistNoCorrectionHelp: "Room Assist n’applique aucune correction de consigne. La température ambiante peut néanmoins différer de la température programmée.",
	roomSensorBlockActiveSince: "Actif depuis {time}",
	roomSensorBlockMode: "Mode : {mode}",
	roomSensorBlockScheduled: "Prévu à {time}",
	roomSensorBlockStartedEarly: "Démarré à {time}",
	roomSensorBlockTarget: "Consigne : {target}",
	roomSensorGapAboveTarget: "{value} au-dessus de la consigne",
	roomSensorGapBelowTarget: "{value} sous la consigne",
	roomSensorClimateTarget: "Consigne du thermostat",
	roomSensorClimateTemperature: "Mesure du thermostat",
	roomSensorCollapseClimate: "Réduire {climate}",
	roomSensorControl: "Assistance du capteur ambiant",
	roomSensorExpandClimate: "Développer {climate}",
	roomSensorIntroDetail: "Utilisez un capteur de température ambiante pour guider la consigne du thermostat pendant les plages de température gérées par Velair.",
	roomSensorIntroTitle: "Régulation par température ambiante",
	roomSensorLiveStatus: "État en direct",
	roomSensorNoActiveBlock: "Aucune plage de température active",
	roomSensorNoActiveBlockDetail: "Room Assist s’actualisera lorsqu’une plage de température gérée sera active.",
	roomSensorNotConfigured: "Sélectionnez d’abord un capteur ambiant",
	roomSensorRoomTemperature: "Capteur ambiant",
	roomSensorRemainingToTarget: "Jusqu’à la consigne",
	roomSensorRemainingValue: "{value} restant",
	roomSensorScheduledTarget: "Consigne programmée",
	roomSensorSelectSensor: "Sélectionner un capteur ambiant",
	roomSensorStatusAssisting: "Assistance active",
	roomSensorStatusBlocked: "Bloqué",
	roomSensorStatusDisabled: "Désactivé",
	roomSensorStatusHolding: "Maintien",
	roomSensorStatusIdle: "Inactif",
	roomSensorStatusNotConfigured: "Non configuré",
	roomSensorStatusReady: "Prêt",
	roomSensorStatusUnavailable: "Indisponible",
	roomSensorTemperatureEntity: "Capteur de température ambiante",
	roomSensorTemperatureEntityHelp: "Capteur utilisé par Room Assist comme température réelle de la pièce lors de l’ajustement de la consigne.",
	roomSensorTemperatureScale: "Échelle de température de Room Assist",
	roomSensorUnavailable: "Thermostat indisponible",
	roomSensorValueUnavailable: "Indisponible",
	save: "Enregistrer",
	saveTemplate: "Enregistrer comme modèle",
	saved: "Programme enregistré",
	saving: "Enregistrement",
	scheduleCopyHint: "Vous pouvez aussi copier cette configuration vers un autre jour ou thermostat.",
	scheduleEditor: "Éditeur de programme",
	scheduleStepClimate: "1. Sélectionnez le thermostat à configurer.",
	scheduleStepConfigure: "3. Configurez le thermostat selon vos besoins.",
	scheduleStepDay: "2. Sélectionnez le jour à configurer.",
	reorderZones: "Faites glisser les thermostats pour modifier leur ordre dans le panneau.",
	selectedWeekday: "Jour initial",
	selectedZone: "Zone initiale",
	selectTemplatePlaceholder: "Sélectionner un modèle",
	selectTemplateToBegin: "Sélectionnez un modèle pour commencer.",
	setTemperature: "Régler la température",
	settings: "Réglages",
	settingsPanelIntro: "Choisissez l’ordre des thermostats et des jours de la semaine dans ce panneau.",
	startupBehavior: "Démarrage de Home Assistant",
	startsAt: "Commence à",
	applyScheduleOnStartup: "Appliquer le programme actif au démarrage",
	applyScheduleOnStartupDescription: "Au démarrage de Home Assistant, Velair peut appliquer la plage actuelle du programme aux thermostats gérés au lieu de les laisser inchangés.",
	start: "Démarrer",
	status: "État",
	stop: "Arrêter",
	supportedFanModes: "Modes du ventilateur",
	supportedHorizontalSwingModes: "Modes d’oscillation horizontale",
	supportedPresetModes: "Préréglages",
	supportedSwingModes: "Modes d’oscillation",
	presetMode: "Préréglage",
	swingMode: "Oscillation",
	temp: "Temp.",
	temperatureRange: "Plage de température",
	temperatureUnit: "Unité de température",
	temperatureUnitManagedByHomeAssistant: "Détectée depuis Home Assistant. Modifiez cette valeur dans les réglages du système d’unités de Home Assistant.",
	temperatureMigrationRequired: "Velair requiert votre attention",
	temperatureMigrationStopped: "Le planificateur et la configuration thermique sont verrouillés car Home Assistant a changé d’unité de température. Ouvrez les réglages Velair pour effectuer une migration sûre.",
	temperatureMigrationQuestion: "Convertir les températures enregistrées de {source} vers {target} ?",
	temperatureMigrationExplanation: "Continuez uniquement si toutes les températures enregistrées dans Velair sont encore en {source}. La migration convertit les programmes, modèles, dérogations, réglages Confort, Room Assist et Anticipation, les taux et les données d’apprentissage avant de relancer le planificateur. Toute valeur déjà en {target} deviendrait incorrecte.",
	temperatureMigrationUse: "Convertir {source} vers {target}",
	temperatureMigrationConfirm: "Confirmer que toutes les températures enregistrées dans Velair sont en {source} et les convertir en {target} ? Ne continuez pas si une valeur est déjà en {target}, car elle deviendrait incorrecte. Le planificateur restera arrêté si la migration ne peut pas être enregistrée.",
	temperatureMigrationComplete: "Températures mises à jour et planificateur relancé",
	temperatureMigrationFailed: "Impossible de mettre à jour les températures",
	temperatureLegacyResetQuestion: "Réinitialiser les anciennes données Celsius pour {target} ?",
	temperatureLegacyResetExplanation: "Cette installation a été créée par une version de Velair qui enregistrait uniquement des valeurs Celsius. Comme Home Assistant utilise maintenant {target}, réinitialisez Velair pour supprimer les anciennes données et créer des valeurs par défaut sûres adaptées à l’unité. Les prochains changements d’unité proposeront une conversion complète.",
	temperatureLegacyResetStopped: "Le planificateur est arrêté car cette ancienne installation contient uniquement des données Celsius alors que Home Assistant utilise les Fahrenheit. Ouvrez les réglages Velair et utilisez Réinitialiser Velair pour créer des valeurs par défaut en Fahrenheit.",
	temperatureStep: "Pas",
	temperatureStepNotReported: "Non signalé par Home Assistant",
	temperatureStepNotReportedDescription: "Ce thermostat ne publie pas target_temp_step. Velair ne déduit aucun pas de température.",
	targetTemp: "Température cible",
	targetHumidity: "Humidité cible",
	targetBy: "Consigne à atteindre à",
	targetTemperature: "Température cible",
	todayTimeline: "Programme du jour",
	updateTemplate: "Mettre à jour le modèle",
	templateDeleted: "Modèle supprimé",
	templateNameRequired: "Le nom du modèle est obligatoire",
	templateOptionalHint: "Choisissez un modèle ou configurez le programme manuellement.",
	templateSaved: "Modèle enregistré",
	templates: "Modèles",
	thermostat: "Thermostat",
	templatesPanelIntro: "L’édition des modèles sera déplacée ici pour que l’éditeur de programme reste clair.",
	time: "Heure",
	timeline: "Programme",
	title: "Titre",
	unableApplyThermostats: "Impossible d’appliquer le programme aux thermostats",
	unableCopy: "Impossible de copier le programme",
	unableLoad: "Impossible de charger les données du planificateur",
	unablePause: "Impossible de mettre le planificateur en pause",
	unableResume: "Impossible de relancer le planificateur",
	unableReset: "Impossible de réinitialiser les données Velair",
	unableSave: "Impossible d’enregistrer le programme",
	unableSaveSettings: "Impossible d’enregistrer les réglages",
	unableDeleteTemplate: "Impossible de supprimer le modèle",
	unableExport: "Impossible d’exporter les données",
	unableSaveTemplate: "Impossible d’enregistrer le modèle",
	unableSubscribe: "Impossible de s’abonner aux mises à jour du planificateur",
	unsupportedModeForClimate: "{entity} ne prend pas en charge le mode {mode} à {start}. Passez cette plage sur Conserver ou choisissez un mode compatible avant l’application.",
	unsaved: "non enregistré",
	waiting: "En attente des données du planificateur",
	zoneOrder: "Ordre des thermostats",
	zonesManaged: "{count} zones gérées",
	weekdays: {
		monday: "Lundi",
		tuesday: "Mardi",
		wednesday: "Mercredi",
		thursday: "Jeudi",
		friday: "Vendredi",
		saturday: "Samedi",
		sunday: "Dimanche"
	},
	schedulerStatuses: {
		idle: "Inactif",
		override_active: "Forçage actif",
		paused: "En pause",
		scheduled: "Programmé"
	},
	schedulerModes: {
		auto: "Auto",
		paused: "En pause"
	},
	hvacModes: {
		auto: "Auto",
		cool: "Refroidissement",
		dry: "Déshumidification",
		fan_only: "Ventilation seule",
		heat: "Chauffage",
		heat_cool: "Chauffage/refroidissement",
		off: "Arrêt"
	},
	hvacActions: {
		cooling: "Refroidissement",
		drying: "Déshumidification",
		fan: "Ventilation",
		heating: "Chauffage",
		idle: "Inactif",
		off: "Arrêt",
		preheating: "Préchauffage",
		defrosting: "Dégivrage"
	}
}, dt = /* @__PURE__ */ t({ nl: () => ft }), ft = {
	addBlock: "Blok toevoegen",
	apply: "Toepassen",
	cloneDayToDays: "Dag kopiëren naar",
	cloneDayToThermostats: "Dag kopiëren naar",
	cloneAction: "Kopiëren",
	appliedDays: "Gekopieerd naar {count} dag{suffix}",
	appliedTemplateTargets: "Toegepast op {count} doelen",
	appliedThermostats: "Gekopieerd naar {count} thermostaat{suffix}",
	applying: "Toepassen",
	applyTemplate: "Sjabloon toepassen",
	applyTo: "Toepassen op",
	applyToAction: "Toepassen op...",
	applyTemplateTo: "{template} toepassen op...",
	boost: "Boost",
	boostActive: "Boost actief",
	activeBoosts: "Actieve boosts",
	availableModes: "Beschikbare modi",
	boostTarget: "Boostdoel",
	boostUntil: "Eindigt over",
	blocks: "Blokken",
	build: "Build",
	cardView: "Kaartweergave",
	activeSetupCardControls: "Bediening actieve instelling",
	activeSetupCardControlsBoth: "Modi en profielen",
	activeSetupCardControlsDescription: "Kies wat deze kaart kan wijzigen. De huidige modus en toegepaste profielen blijven zichtbaar.",
	activeSetupCardControlsModes: "Alleen modi",
	activeSetupCardControlsProfiles: "Alleen profielen",
	cardViewOverviewBoosts: "Overzicht: actieve boosts",
	cardViewOverviewEvents: "Overzicht: volgende gebeurtenissen",
	cardViewOverviewStatus: "Overzicht: plannerstatus",
	cardViewOverviewTimeline: "Overzicht: tijdlijn van vandaag",
	cardViewOverviewZones: "Overzicht: zoneoverzicht",
	cardViewActiveSetup: "Profielen: actieve instelling",
	cardViewSchedules: "Schema's: editor",
	cardViewSensors: "Room Assist: configuratie en status",
	cardViewComfort: "Comfort: configuratie en status",
	cardViewPreconditioning: "Voorconditionering: configuratie en status",
	cardThermostatHidden: "Verborgen op deze kaart",
	cardThermostatVisible: "Getoond op deze kaart",
	cardThermostats: "Thermostaten op deze kaart",
	cardThermostatsDescription: "Kies welke thermostaten deze kaart toont en bepaal de volgorde.",
	comfortCardVisibility: "Zichtbaarheid Comfort-kaart",
	comfortCardVisibilityDescription: "Kies welke Comfort-instellingen en livegrafieken deze kaart toont.",
	comfortCardShowCo2: "CO2-grafiek tonen",
	comfortCardShowConfiguration: "Configuratie tonen",
	comfortCardShowHumidity: "Luchtvochtigheidsgrafiek tonen",
	comfortCardShowTemperature: "Temperatuurgrafiek tonen",
	roomAssistCardVisibility: "Zichtbaarheid Room Assist",
	roomAssistCardVisibilityDescription: "Kies welke bediening en statusdetails van Room Assist deze kaart toont.",
	roomAssistShowDebounce: "Vernieuwingsvertraging tonen",
	roomAssistShowLiveStatus: "Livestatus tonen",
	roomAssistShowMaxDelta: "Maximale correctie tonen",
	roomAssistShowSensor: "Kamertemperatuursensor tonen",
	roomAssistShowSwitch: "Aan/uit-schakelaar tonen",
	current: "Huidig",
	currentHumidity: "Luchtvochtigheid",
	currentTemperature: "Huidige temperatuur",
	currentTime: "Huidige tijd: {time}",
	clear: "Wissen",
	confirmDeleteTemplate: "Sjabloon {template} verwijderen?",
	confirmTemplate: "{weekday} vervangen door {template}?",
	comfort: "Comfort",
	comfortAirQuality: "Luchtkwaliteit",
	comfortAirQualityElevated: "CO2 verhoogd",
	comfortAirQualityGood: "Goede luchtkwaliteit",
	comfortAirQualityPoor: "Slechte luchtkwaliteit",
	comfortAirQualityUnavailable: "CO2 niet beschikbaar",
	comfortAutomaticSourceValue: "Automatisch: {entity}",
	comfortCo2: "CO2",
	comfortCo2Attention: "Verhoogd",
	comfortCo2Limits: "CO2-grenzen",
	comfortCo2LimitsHelp: "Verhoogd geeft een vroege waarschuwing. Slecht geeft een ernstiger CO2-niveau aan.",
	comfortCo2Poor: "Slecht",
	comfortCo2Sensor: "CO2-sensor",
	comfortCollapseClimate: "{climate} inklappen",
	comfortConditionCold: "Koud",
	comfortConditionColdAndDry: "Koud en droog",
	comfortConditionColdAndHumid: "Koud en vochtig",
	comfortConditionComfortable: "Comfortabel",
	comfortConditionDry: "Droge lucht",
	comfortConditionHot: "Warm",
	comfortConditionHotAndDry: "Warm en droog",
	comfortConditionHotAndHumid: "Warm en vochtig",
	comfortConditionHumid: "Vochtig",
	comfortConditionHumidityComfortable: "Luchtvochtigheid binnen bereik",
	comfortConditionMonitoringOff: "Bewaking uit",
	comfortConditionNoReadings: "Geen metingen",
	comfortConditionReadingsOutdated: "Metingen verouderd",
	comfortConditionTemperatureComfortable: "Temperatuur binnen bereik",
	comfortCooler: "Koeler",
	comfortCurrentReadings: "Huidige metingen",
	comfortDataFreshness: "Actualiteit gegevens",
	comfortDataIssueCo2Missing: "CO2 niet beschikbaar",
	comfortDataIssueCo2Stale: "CO2-meting verouderd",
	comfortDataIssueHumidityMissing: "Luchtvochtigheid niet beschikbaar",
	comfortDataIssueHumidityStale: "Luchtvochtigheidsmeting verouderd",
	comfortDataIssueTemperatureMissing: "Temperatuur niet beschikbaar",
	comfortDataIssueTemperatureStale: "Temperatuurmeting verouderd",
	comfortDataPartial: "Onvolledige metingen",
	comfortDataStale: "Metingen verouderd",
	comfortDataUnavailable: "Geen bruikbare metingen",
	comfortDisabledDetail: "Comfortbewaking staat uit voor deze klimaatentiteit. Er worden geen comfortsensoren gevolgd.",
	comfortDoNotMonitor: "CO2 niet bewaken",
	comfortDoNotMonitorHumidity: "Luchtvochtigheid niet bewaken",
	comfortDrier: "Droger",
	comfortExpandClimate: "{climate} uitklappen",
	comfortHumidity: "Luchtvochtigheid",
	comfortHumidityRange: "Luchtvochtigheidsbereik",
	comfortHumidityRangeHelp: "Een smaller bereik waarschuwt eerder; een breder bereik is toleranter.",
	comfortHumiditySensor: "Luchtvochtigheidssensor",
	comfortIntroDetail: "Bewaak temperatuur, luchtvochtigheid en CO2 lokaal en gebruik Velair-gebeurtenissen in Home Assistant-automatiseringen.",
	comfortIntroTitle: "Omgevingscomfort",
	comfortMaximum: "Max",
	comfortMinimum: "Min",
	comfortMoreHumid: "Vochtiger",
	comfortMapCurrentPosition: "Huidige positie: {temperature}, {humidity}",
	comfortNotMonitored: "Niet bewaakt",
	comfortSelectSensor: "Automatische bron gebruiken",
	comfortStaleAfter: "Verouderd na",
	comfortStaleAfterHelp: "Maximale tijd sinds de laatste statusupdate in Home Assistant. Hoger vertrouwt oudere waarden langer; lager markeert sensoren eerder als verouderd.",
	comfortTargetZone: "Comfortbereik",
	comfortTemperature: "Temperatuur",
	comfortTemperatureRange: "Temperatuurbereik",
	comfortTemperatureRangeHelp: "Een smaller bereik waarschuwt eerder; een breder bereik is toleranter.",
	comfortTemperatureSensor: "Temperatuursensor",
	comfortUnavailable: "Klimaatentiteit niet beschikbaar",
	comfortWarmer: "Warmer",
	createTemplate: "Sjabloon maken",
	customTemplateName: "Sjabloonnaam",
	day: "Dag",
	daySchedule: "Dagschema",
	defaultZone: "Eerste beheerde zone",
	deleteBlock: "Blok verwijderen",
	deleteTemplate: "Sjabloon verwijderen",
	dismiss: "Sluiten",
	duplicateStart: "Dubbele starttijd: {start}",
	entityDiagnosticMissing: "Entiteit niet gevonden",
	entityDiagnosticNoModes: "Geen ondersteunde HVAC-modi gemeld",
	entityDiagnosticNoRange: "Geen temperatuurbereik gemeld",
	entityDiagnosticNotClimate: "Entiteit is geen klimaatentiteit",
	entityDiagnosticOk: "Thermostaatconfiguratie is in orde",
	fanMode: "Ventilatormodus",
	horizontalSwingMode: "Horizontale zwenkmodus",
	invalidStart: "Ongeldige starttijd: {start}",
	invalidTemperature: "Ongeldige temperatuur voor {start}",
	invalidTemperatureRange: "Gebruik {min} tot {max}",
	invalidTemperatureStep: "Gebruik stappen van {step}",
	incompatibleScheduleTargets: "Enkele schemadoelen moeten worden gecontroleerd",
	incompatibleScheduleTargetsDescription: "{count} opgeslagen doel(en) passen niet meer binnen het bereik of de temperatuurstap van de thermostaat. Open Schema's en sla een ondersteunde waarde op.",
	operationRecoveryRequired: "Velair heeft de gegevens opgeslagen maar kon niet hervatten",
	operationRecoveryDescription: "De planning blijft gestopt. Herlaad de Velair-integratie of herstart Home Assistant om het herstel te voltooien.",
	operationCancelled: "De bewerking is geannuleerd",
	operationCurrentZone: "Bezig met {zone}",
	operationDefaultCompleted: "Standaardschema's hersteld",
	operationDefaultFailed: "Kan standaardschema's niet herstellen",
	operationDefaultPartial: "Standaardschema's met problemen hersteld",
	operationDefaultRunning: "Standaardschema's herstellen",
	operationDismiss: "Bewerkingsstatus sluiten",
	operationFailedHelp: "Bekijk de betreffende klimaatentiteit en Home Assistant-logboeken voor details",
	operationFailureCount: "{count} zones met problemen: {zones}",
	operationFailureOne: "1 zone met problemen: {zones}",
	operationModeCompleted: "Modus {target} toegepast",
	operationModeFailed: "Kan modus {target} niet toepassen",
	operationModePartial: "Modus {target} met problemen toegepast",
	operationModeRunning: "Modus {target} toepassen",
	operationNoZones: "Geen zones hoefden te worden gewijzigd",
	operationProfileCompleted: "Profiel {target} toegepast",
	operationProfileFailed: "Kan profiel {target} niet toepassen",
	operationProfilePartial: "Profiel {target} met problemen toegepast",
	operationProfileRunning: "Profiel {target} toepassen",
	operationProgress: "{completed} van {total} zones verwerkt",
	operationProgressLabel: "Voortgang Velair-bewerking",
	keep: "Behouden",
	keepMode: "Modus behouden",
	tagline: "Klimaatautomatisering die zich aanpast aan je leven.",
	loading: "Plannergegevens laden...",
	loadingEntities: "Beheerde zones laden...",
	managedEntityAvailable: "Beschikbaar",
	managedEntityMissing: "Niet gevonden",
	managedEntitiesStatus: "Beheerde thermostaten",
	menu: "Menu",
	minutesShort: "min",
	secondsShort: "s",
	providedData: "Aangeleverde gegevens",
	profiles: "Profielen",
	profilesAndModes: "Profielen en modi",
	activeSetup: "Actieve instelling",
	activeSetupDescription: "Bekijk wat je zones nu aanstuurt en wijzig dit op één plek.",
	activeSetupChange: "Wijzigen",
	activeSetupModesHelp: "Kies de modus die de actieve profielen moet aansturen.",
	activeSetupAppliedProfiles: "Toegepaste profielen",
	activeSetupNoProfiles: "Geen profielen toegepast. Zones volgen hun standaardschema.",
	activeSetupManualProfile: "Een profiel handmatig activeren",
	activeSetupManualProfileHelp: "Dit vervangt alle actieve profielen en zet de modus op Handmatig. Gebruik een modus om meerdere profielen tegelijk te activeren.",
	profilesPanelIntro: "Profielen bepalen alternatieve klimaatroutines. Modi activeren één of meer profielen tegelijk.",
	profileLibrarySelectorLabel: "Profiel- en modusbibliotheken",
	profilesLibraryDescription: "Bepaal hoe geselecteerde zones zich gedragen.",
	profilesDescription: "Een profiel bepaalt hoe één of meer zones zich gedragen wanneer het actief is.",
	profileActive: "Actief profiel",
	profilesActive: "Actieve profielen",
	profileActivate: "Profiel activeren",
	profileBehaviorDefault: "Standaardschema",
	profileBehaviorPause: "Schema pauzeren",
	profileBehaviorSchedule: "Profielschema",
	profileBlockAction: "Actie",
	profileBrowseIcons: "Beschikbare pictogrammen bekijken",
	profileConfirmDelete: "{profile} en alle zone-instellingen verwijderen? Dit kan niet ongedaan worden gemaakt.",
	profileConfirmDeleteActive: "{profile} is actief. Verwijderen en de zones terugzetten op Standaard? Andere actieve profielen blijven behouden. Dit kan niet ongedaan worden gemaakt.",
	profileColor: "Profielkleur",
	profileColorHelp: "Wordt gebruikt om dit profiel in keuzelijsten en overzichten te herkennen.",
	profileCopyTemplate: "Sjabloon naar deze dag kopiëren",
	profileCreate: "Nieuw profiel",
	profileDelete: "Profiel verwijderen",
	profileDeleted: "Profiel verwijderd",
	profileDescription: "Beschrijving",
	profileDescriptionCharactersRemaining: "Nog {count} tekens",
	profileDescriptionTooLong: "De beschrijving mag maximaal {count} tekens bevatten.",
	profileDiscardChanges: "Niet-opgeslagen profielwijzigingen negeren?",
	profileCollapseClimate: "{climate} inklappen",
	profileExpandClimate: "{climate} uitklappen",
	profileIcon: "Pictogram",
	profileIconHelp: "Gebruik een sleutel van Material Design Icons, bijvoorbeeld mdi:briefcase-outline.",
	profileActiveContext: "Actieve klimaatcontext",
	modeBuiltInHelp: "Ingebouwde modi kunnen niet worden hernoemd of verwijderd.",
	modeInformation: "Over {mode}",
	modeChooseProfile: "Kies een profiel",
	modeConfirmDelete: "Modus {mode} verwijderen? Dit kan niet ongedaan worden gemaakt.",
	modeCreate: "Nieuwe modus",
	modeDelete: "Modus verwijderen",
	modeDeleted: "Modus verwijderd",
	modeDiscardChanges: "Niet-opgeslagen moduswijzigingen negeren?",
	modeDefault: "Standaard",
	modeDefaultDescription: "Deactiveert profielen en herstelt het standaardschema van elke zone.",
	modeManual: "Handmatig",
	modeManualDescription: "Actieve profielen worden niet door een modus aangestuurd.",
	modeCustomDescription: "Activeert de gekoppelde profielen: {profile}.",
	modeChange: "Modus wijzigen",
	modeLabel: "Modus",
	modeMappedProfile: "Gekoppeld profiel: {profile}",
	modeMappedProfileMissing: "Gekoppeld profiel niet beschikbaar: {profile}",
	modeMappedProfiles: "Gekoppelde profielen: {profiles}",
	modeName: "Modusnaam",
	modeNameDuplicate: "Gebruik een unieke modusnaam.",
	modeNameHelp: "Deze waarde verschijnt in de moduskiezer van Home Assistant.",
	modeNameRequired: "Een modusnaam is vereist.",
	modeNameTooLong: "De modusnaam mag maximaal {count} tekens bevatten.",
	modeProfile: "Gekoppeld profiel",
	modeProfiles: "Gekoppelde profielen",
	modeProfileHelp: "Deze modus activeert alle geselecteerde profielen. Een zone kan maar bij één daarvan horen.",
	modeProfileRequired: "Selecteer minimaal één profiel en vermijd profielen die dezelfde zone configureren.",
	modeSaved: "Modus opgeslagen",
	modeSelectToBegin: "Selecteer een aangepaste modus om deze te bewerken, of maak er een",
	modeUnableDelete: "Kan de modus niet verwijderen",
	modeUnableActivate: "Kan de modus niet wijzigen",
	modeUnableSave: "Kan de modus niet opslaan",
	modesDescription: "Een modus activeert één of meer profielen tegelijk vanuit Velair of Home Assistant.",
	modesLibraryDescription: "Activeer één of meer profielen tegelijk.",
	modesEntityNote: "Automatiseringen kunnen een modus kiezen via select.velair_mode of één profiel activeren met velair.activate_profile en de automatiserings-ID.",
	modesTitle: "Modi",
	profilesActiveCount: "{count} actieve profielen",
	profileId: "Automatiserings-ID",
	profileIdReadonlyHelp: "Stabiele alleen-lezen-ID voor automatiseringen en services.",
	profileInvalidIcon: "Gebruik een geldige sleutel in de vorm mdi:icon-name.",
	profileInvalidColor: "Kies een geldige kleur in de notatie #RRGGBB.",
	profileInvalidSchedule: "Controleer of elk blok een geldige, unieke tijd en temperatuur heeft.",
	profileName: "Profielnaam",
	profileNameRequired: "Een profielnaam is vereist",
	profileNewName: "Nieuw profiel",
	profileNoDescription: "Geen beschrijving",
	profileNoneCreated: "Geen profielen",
	profileDefaultDescription: "Elke zone gebruikt het eigen standaardschema.",
	profileOverviewLabel: "Profiel",
	profilePauseAction: "Tijdens pauze",
	profilePauseKeep: "Klimaatentiteit ongewijzigd laten",
	profilePauseTurnOff: "Klimaatentiteit uitschakelen",
	profileRemovedElsewhere: "Dit profiel is elders verwijderd. Selecteer of maak een ander profiel.",
	profileSaved: "Profiel opgeslagen",
	profileSelectToBegin: "Selecteer een profiel om het te bewerken",
	profileUnableActivate: "Kan profiel niet activeren",
	profileUnableDelete: "Kan profiel niet verwijderen",
	profileZoneBehavior: "Zonegedrag",
	portability: "Overdraagbaarheid",
	portabilityDescription: "Exporteer of importeer Velair-gegevens met een JSON-bestand met versienummer.",
	portabilityFileReady: "{file} gereed",
	portabilityIncluded: "Inbegrepen",
	portabilitySettingsSection: "Instellingen",
	portabilityTemplatesSection: "Sjablonen",
	portabilityZonesSection: "Thermostaatschema's",
	portabilityPreconditioningLearningSection: "Leerdata voorconditionering",
	portabilityProfilesSection: "Klimaatprofielen",
	portabilityModesSection: "Modi",
	preconditioningImportSkipped: "Leerdata voor voorconditionering overgeslagen ({count}). Deze thermostaten worden hier niet beheerd: {entities}",
	portableExported: "Exportbestand gemaakt",
	portableImported: "Import voltooid",
	importData: "Importeren",
	importFile: "Importbestand",
	chooseFile: "Bestand kiezen",
	climateOptions: "Klimaatopties",
	climateOptionsAdd: "Optionele instellingen toevoegen",
	noFileSelected: "Geen bestand geselecteerd",
	exportData: "Exporteren",
	invalidImportFile: "Dit is geen geldig Velair-exportbestand",
	importOverwriteWarning: "Importeren overschrijft bestaande waarden. Zonder voorafgaande export kunnen ze niet worden hersteld.",
	noImportSections: "Geen importeerbare onderdelen gevonden",
	legacyImportTemperatureUnit: "Deze oudere back-up bevat geen temperatuureenheid. Velair behandelt de temperaturen als Celsius en zet ze zo nodig om naar {target}.",
	notSet: "Niet ingesteld",
	maintenance: "Onderhoud",
	maintenanceDescription: "Technische versiegegevens voor probleemoplossing.",
	frontendBuild: "Frontend-build",
	portableFormatVersion: "Overdrachts-/exportformaat",
	internalStorageVersion: "Opslag/model",
	integrationVersion: "Integratieversie",
	resetVelair: "Velair resetten",
	resetVelairDescription: "Verwijdert alle opgeslagen Velair-gegevens, waaronder schema's, sjablonen, paneelvoorkeuren, actieve boosts en pauzes, instellingen voor Comfort en Room Assist, instellingen en leerdata voor adaptieve voorconditionering en opstartgedrag. Daarna worden veilige standaardwaarden met de juiste eenheid gemaakt voor de beheerde thermostaten.",
	confirmReset: "Alle opgeslagen Velair-gegevens resetten? Dit kan alleen worden hersteld als je de gegevens eerst hebt geëxporteerd.",
	confirmResetPreconditioningLearning: "Leerdata voor adaptieve voorconditionering voor {direction} resetten? Schema's en instellingen blijven behouden.",
	confirmResetPreconditioningSettings: "De standaardinstellingen voor voorconditionering van deze thermostaat herstellen? Leermetingen blijven behouden.",
	resetDone: "Velair-gegevens gereset",
	resetting: "Resetten",
	minTemperature: "Minimumtemperatuur",
	maxTemperature: "Maximumtemperatuur",
	modeOptional: "Modus optioneel",
	firstWeekday: "Eerste dag van de week",
	managedZones: "Beheerde zones",
	mode: "Modus",
	moveDown: "Omlaag verplaatsen",
	moveUp: "Omhoog verplaatsen",
	nextEvent: "Volgende gebeurtenis",
	nextEvents: "Volgende gebeurtenissen",
	noActiveBoosts: "Geen actieve boosts",
	noBlocks: "Geen blokken",
	noManagedEntities: "Geen beheerde klimaatentiteiten gevonden.",
	noTemplates: "Geen sjablonen",
	newTemplate: "Nieuw sjabloon",
	noUpcomingEvent: "Geen komende gebeurtenis",
	off: "Uit",
	otherDays: "Andere dagen",
	otherThermostats: "Andere thermostaten",
	overview: "Overzicht",
	overviewPanelIntro: "De hoofdweergave groepeert de plannerstatus, komende gebeurtenissen, actieve boosts en snelle acties.",
	overviewStatusPaused: "Gepauzeerd",
	overviewStatusPausedDetail: "Tijdelijke pauze actief",
	overviewStatusRunning: "Actief",
	overviewStatusRunningDetail: "Planner past schema's toe",
	overviewStatusStopped: "Gestopt",
	overviewStatusStoppedDetail: "Planner is gestopt tot deze wordt hervat",
	overviewZones: "Zoneoverzicht",
	overviewZoneApplied: "Toegepast",
	overviewZoneAir: "Lucht: {status}",
	overviewZoneBoost: "Boost",
	overviewZoneComfort: "Comfort: {status}",
	overviewZoneManual: "Handmatig",
	overviewZonePaused: "Gepauzeerd",
	overviewZonePreconditioning: "Voorconditionering",
	overviewZoneResumes: "Hervat om {time}",
	overviewZoneRoom: "Kamer",
	overviewZoneRoomAssist: "Room Assist {delta}",
	overviewZoneScheduled: "Gepland",
	overviewZoneSensorIssue: "Sensorgegevens onvolledig",
	overviewZoneTarget: "Doel",
	overviewZoneUntil: "Tot {time}",
	overviewZoneUntilResumed: "Tot hervatting",
	overviewZoneReadyAt: "Gereed om {time}",
	overviewZoneNextAt: "Volgende om {time}",
	overviewZoneAutomationOff: "Automatisering uit",
	overviewZoneRoomAssistThermalFlow: "Temperatuurverloop Room Assist",
	overviewZoneSensor: "Sensor",
	overviewZoneClimate: "Klimaat",
	overviewZoneTemperature: "Temperatuur",
	overviewZoneSetpoint: "Instelpunt",
	overviewZoneScheduledSetpoint: "Gepland",
	overviewZoneOffset: "Afwijking",
	overviewZoneRoomAssistActive: "Actief",
	overviewZoneRoomAssistHolding: "Vasthouden",
	overviewZoneComfortLabel: "Comfort",
	overviewZoneAirLabel: "Lucht",
	overviewZoneDataLabel: "Gegevens",
	pause: "Pauzeren",
	pauseActive: "Gepauzeerd",
	pauseApplied: "Planner gepauzeerd",
	pauseDuration: "Pauzeduur (min)",
	pauseFrom: "Van",
	pauseIndefinite: "Geen eindtijd",
	pauseRemaining: "Hervat over",
	pauseTo: "Tot",
	preconditioning: "Voorconditionering",
	preconditioningEnabled: "Voorconditionering ingeschakeld",
	preconditioningCool: "Koelen",
	preconditioningCoolingFallbackLead: "Terugval koelen (min)",
	preconditioningDirectionSamples: "{count}/{required}",
	preconditioningHeat: "Verwarmen",
	preconditioningHeatingFallbackLead: "Terugval verwarmen (min)",
	preconditioningDirectionStatus: "Status",
	preconditioningExpandClimate: "{climate} uitklappen",
	preconditioningIntroDetail: "Laat Velair berekenen wanneer een gepland comfortdoel moet starten, zodat de kamer op tijd dichter bij de juiste temperatuur is.",
	preconditioningIntroTitle: "Adaptieve comforttiming",
	preconditioningAdaptivePercentile: "Dynamisch comfortpercentiel",
	preconditioningAdaptivePercentileHelp: "Aan vergroot de marge na te veel gedeeltelijke pogingen en verkleint deze na consequent voltooide pogingen.",
	preconditioningCalculationCombined: "Gecombineerd",
	preconditioningCalculationDetails: "Berekeningsdetails",
	preconditioningCalculationFinalLead: "Definitieve voorsprong",
	preconditioningCalculationPartialFloor: "Ondergrens gedeeltelijk",
	preconditioningCalculationReachedEstimate: "Schatting bereikt",
	preconditioningCalculationRounded: "Afgerond",
	preconditioningCalculationSampleCounts: "Bereikt: {reached} · Gedeeltelijk: {partial} · Ongeldig: {invalid}",
	preconditioningCalculationSamples: "Metingen",
	preconditioningComfortPercentile: "Comfortpercentiel",
	preconditioningComfortPercentileHelp: "Hoger start eerder op basis van langzamere leersituaties; lager start later met minder marge.",
	preconditioningComfortPercentileLabel: "Comfortpercentiel",
	preconditioningCollapseClimate: "{climate} inklappen",
	preconditioningFallbackInactive: "Adaptief model actief",
	preconditioningFallbackLabel: "Terugval",
	preconditioningFallbackLead: "{minutes} min",
	preconditioningFallbackMinutesPerDegree: "Beginmodel",
	preconditioningFallbackMinutesPerDegreeHelp: "Hoger start eerder zolang er onvoldoende leerdata is; lager start later.",
	preconditioningHistorySize: "Geschiedenisgrootte",
	preconditioningHistorySizeHelp: "Hoger bewaart meer bruikbare metingen; lager vergeet oudere metingen sneller.",
	preconditioningHistory: "Geschiedenis",
	preconditioningInvalidEvents: "Ongeldig",
	preconditioningLastSample: "Laatste meting",
	preconditioningLeadTime: "{minutes} min eerder",
	preconditioningLearning: "Lokaal leren",
	preconditioningLearningStatus: "Leerstatus",
	preconditioningLearningDisabled: "Leren uitgeschakeld",
	preconditioningLearningMoreData: "Meer gegevens nodig",
	preconditioningLearningReady: "Leren gereed",
	preconditioningLimitedByMax: "Begrensd door maximum",
	preconditioningLivePrediction: "Livevoorspelling",
	preconditioningLivePredictionHelp: "Gebruikt het volgende echte blok om te tonen hoe de berekende start van de voorconditionering verandert.",
	preconditioningMaxLead: "Maximale voorsprong (min)",
	preconditioningMaxLeadHelp: "Hoger staat eerder starten toe; lager begrenst de voorsprong sterker.",
	preconditioningMaximumLabel: "Maximum",
	preconditioningMinimumDelta: "Minimaal temperatuurverschil",
	preconditioningMinimumDeltaHelp: "Hoger negeert grotere kleine verschillen; lager reageert op kleinere temperatuurverschillen.",
	preconditioningMinStart: "Minimale voorsprong (min)",
	preconditioningMinStartHelp: "Hoger negeert korte voorspelde voorsprongen; lager staat kleinere vroege starts toe.",
	preconditioningModelHistory: "Vergelijkbare geschiedenis",
	preconditioningModel: "Leermodel",
	preconditioningModelInitial: "Beginmodel",
	preconditioningModelSource: "Modelbron",
	preconditioningNextBlock: "Volgend blok",
	preconditioningNoUpcomingDirectionEvent: "Geen komend blok voor {direction} om te voorspellen.",
	preconditioningNormalStart: "Normale start",
	preconditioningNotSupported: "Niet ondersteund",
	preconditioningPartialEvents: "Gedeeltelijk",
	preconditioningPartialSamples: "{count} gedeeltelijk",
	preconditioningPartialExpiry: "Vervaldatum gedeeltelijk (dagen)",
	preconditioningPartialExpiryHelp: "Hoger laat onvoltooide pogingen langer meetellen; lager laat ze eerder vervallen.",
	preconditioningQualityComplete: "Voltooid",
	preconditioningQualityInvalid: "Ongeldig",
	preconditioningQualityPartial: "Gedeeltelijk",
	preconditioningRecencyDecay: "Verval recente metingen (dagen)",
	preconditioningRecencyDecayHelp: "Hoger laat oude metingen langzamer aan gewicht verliezen; lager geeft de voorkeur aan recent gedrag.",
	preconditioningReachedEvents: "Bereikt",
	preconditioningResetLearning: "Leerdata resetten",
	preconditioningLearningResetDone: "Leerdata voor {direction} gereset",
	preconditioningSimilarSamples: "Vergelijkbare metingen",
	preconditioningSimilarSamplesHelp: "Hoger gebruikt meer nabije geschiedenis; lager richt zich op de meest vergelijkbare situaties.",
	preconditioningUnsupportedDirection: "Niet ondersteund door deze thermostaat",
	preconditioningOutdoorTemperatureEntity: "Buitentemperatuursensor",
	preconditioningOutdoorTemperatureEntityHelp: "Geeft lokale buitencontext om leermetingen te vergelijken; het beginmodel verandert niet.",
	preconditioningOutdoorContext: "Buitencontext",
	preconditioningOutdoorDisabled: "Uitgeschakeld",
	preconditioningSelectOutdoorSensor: "Sensor selecteren",
	preconditioningResetSettings: "Standaardinstellingen herstellen",
	preconditioningSettingsResetDone: "Instellingen voorconditionering hersteld",
	preconditioningStarts: "Start",
	preconditioningTargetBy: "Doel om",
	preconditioningTiming: "Timing en grenzen",
	preconditioningUnavailable: "Thermostaat niet beschikbaar. Voorconditionering kan niet worden ingeschakeld.",
	preconditioningUseOutdoorTemperature: "Buitentemperatuur gebruiken",
	preconditioningUseOutdoorTemperatureHelp: "Aan neemt de buitentemperatuur mee bij het kiezen van vergelijkbare leermetingen.",
	resume: "Hervatten",
	resumed: "Planner hervat",
	resizeEnd: "Einde aanpassen",
	resizeStart: "Start aanpassen",
	schedulerControls: "Plannerbediening",
	schedules: "Schema's",
	sensors: "Room Assist",
	roomSensorAppliedTarget: "Toegepast doel",
	roomSensorAssist: "Room Sensor Assist",
	roomSensorAssistBadge: "Room Assist",
	roomSensorAssistEnabled: "Room Sensor Assist ingeschakeld",
	roomSensorAssistHelp: "Past het klimaatdoel tijdelijk aan zodat de kamersensor de geplande temperatuur kan bereiken.",
	roomSensorAssistDisabledDetail: "Er is een kamersensor geselecteerd, maar Room Sensor Assist staat uit. Velair gebruikt de klimaattemperatuur totdat deze schakelaar wordt ingeschakeld.",
	roomSensorAssistDebounce: "Vernieuwingsvertraging",
	roomSensorAssistDebounceHelp: "Wachttijd in seconden na een verandering in de kamer- of klimaattemperatuur voordat het aangepaste doel opnieuw wordt berekend. Gebruik 0 voor direct bijwerken.",
	roomSensorAssistMaxDelta: "Maximale correctie",
	roomSensorAssistMaxDeltaHelp: "Hoger kan de klep langer openhouden; lager beperkt hoeveel Velair het klimaatdoel kan aanpassen.",
	roomSensorAssistOffset: "Correctie",
	roomSensorAssistOffsetHelp: "Tijdelijke correctie op het klimaatdoel, zodat de kamersensor naar de geplande temperatuur kan blijven bewegen.",
	roomSensorAssistCorrectionValue: "Correctie {value}",
	roomSensorAssistCorrectionActiveHelp: "Room Assist past het instelpunt aan. Dit geeft niet aan of de klimaatentiteit actief verwarmt of koelt.",
	roomSensorAssistNoCorrection: "Correctie 0 · Vasthouden",
	roomSensorAssistNoCorrectionHelp: "Room Assist past het instelpunt niet aan. De kamer- en geplande temperatuur kunnen nog steeds verschillen.",
	roomSensorBlockActiveSince: "Actief vanaf {time}",
	roomSensorBlockMode: "Modus: {mode}",
	roomSensorBlockScheduled: "Gepland voor {time}",
	roomSensorBlockStartedEarly: "Gestart om {time}",
	roomSensorBlockTarget: "Doel: {target}",
	roomSensorGapAboveTarget: "{value} boven doel",
	roomSensorGapBelowTarget: "{value} onder doel",
	roomSensorClimateTarget: "Klimaatdoel",
	roomSensorClimateTemperature: "Klimaatmeting",
	roomSensorCollapseClimate: "{climate} inklappen",
	roomSensorControl: "Room Sensor Assist",
	roomSensorExpandClimate: "{climate} uitklappen",
	roomSensorIntroDetail: "Gebruik een kamertemperatuursensor om het klimaatdoel te sturen terwijl Velair beheerde temperatuurblokken uitvoert.",
	roomSensorIntroTitle: "Kamertemperatuurregeling",
	roomSensorLiveStatus: "Livestatus",
	roomSensorNoActiveBlock: "Geen actief temperatuurblok",
	roomSensorNoActiveBlockDetail: "Room Assist wordt bijgewerkt wanneer een beheerd temperatuurblok actief is.",
	roomSensorNotConfigured: "Selecteer eerst een kamersensor",
	roomSensorRoomTemperature: "Kamersensor",
	roomSensorRemainingToTarget: "Tot doel",
	roomSensorRemainingValue: "Nog {value}",
	roomSensorScheduledTarget: "Gepland doel",
	roomSensorSelectSensor: "Kamersensor selecteren",
	roomSensorStatusAssisting: "Ondersteunt",
	roomSensorStatusBlocked: "Geblokkeerd",
	roomSensorStatusDisabled: "Uitgeschakeld",
	roomSensorStatusHolding: "Vasthouden",
	roomSensorStatusIdle: "Inactief",
	roomSensorStatusNotConfigured: "Niet geconfigureerd",
	roomSensorStatusReady: "Gereed",
	roomSensorStatusUnavailable: "Niet beschikbaar",
	roomSensorTemperatureEntity: "Kamertemperatuursensor",
	roomSensorTemperatureEntityHelp: "Sensor die Room Sensor Assist als werkelijke kamertemperatuur gebruikt bij het aanpassen van het klimaatdoel.",
	roomSensorTemperatureScale: "Temperatuurschaal Room Assist",
	roomSensorUnavailable: "Klimaatentiteit niet beschikbaar",
	roomSensorValueUnavailable: "Niet beschikbaar",
	save: "Opslaan",
	saveTemplate: "Opslaan als sjabloon",
	saved: "Schema opgeslagen",
	saving: "Opslaan",
	scheduleCopyHint: "Je kunt deze configuratie ook naar een andere dag of klimaatentiteit kopiëren.",
	scheduleEditor: "Schema-editor",
	scheduleStepClimate: "1. Selecteer de klimaatentiteit die je wilt configureren.",
	scheduleStepConfigure: "3. Configureer de klimaatentiteit naar wens.",
	scheduleStepDay: "2. Selecteer de dag die je wilt configureren.",
	reorderZones: "Sleep thermostaten om de volgorde in het paneel te wijzigen.",
	selectedWeekday: "Begindag",
	selectedZone: "Beginzone",
	selectTemplatePlaceholder: "Selecteer een sjabloon",
	selectTemplateToBegin: "Selecteer een sjabloon om te beginnen.",
	setTemperature: "Temperatuur instellen",
	settings: "Instellingen",
	settingsPanelIntro: "Kies de volgorde van thermostaten en weekdagen in dit paneel.",
	startupBehavior: "Opstarten van Home Assistant",
	startsAt: "Start",
	applyScheduleOnStartup: "Actief schema toepassen na opstarten",
	applyScheduleOnStartupDescription: "Wanneer Home Assistant start, kan Velair het huidige schemablok toepassen op de beheerde thermostaten in plaats van ze ongewijzigd te laten.",
	start: "Start",
	status: "Status",
	stop: "Stoppen",
	supportedFanModes: "Ventilatormodi",
	supportedHorizontalSwingModes: "Horizontale zwenkmodi",
	supportedPresetModes: "Voorinstellingen",
	supportedSwingModes: "Zwenkmodi",
	presetMode: "Voorinstelling",
	swingMode: "Zwenken",
	temp: "Temp",
	temperatureRange: "Temperatuurbereik",
	temperatureUnit: "Temperatuureenheid",
	temperatureUnitManagedByHomeAssistant: "Gedetecteerd door Home Assistant. Wijzig dit in de instellingen voor het eenhedenstelsel van Home Assistant.",
	temperatureMigrationRequired: "Velair heeft je aandacht nodig",
	temperatureMigrationStopped: "De planner en temperatuurconfiguratie zijn vergrendeld omdat Home Assistant van temperatuureenheid is veranderd. Open de Velair-instellingen om veilig te migreren.",
	temperatureMigrationQuestion: "Opgeslagen temperaturen omzetten van {source} naar {target}?",
	temperatureMigrationExplanation: "Ga alleen verder als elke opgeslagen Velair-temperatuur nog in {source} staat. Deze migratie werkt schema's, sjablonen, tijdelijke instellingen, Comfort, Room Assist, voorconditioneringsinstellingen, snelheden en leerdata bij voordat de planner wordt hervat. Als een opgeslagen waarde al in {target} staat, wordt die door de migratie onjuist.",
	temperatureMigrationUse: "{source} omzetten naar {target}",
	temperatureMigrationConfirm: "Bevestig dat alle opgeslagen Velair-temperatuurgegevens in {source} staan en zet ze om naar {target}. Ga niet verder als een opgeslagen waarde al in {target} staat, want dan wordt die onjuist. De planner blijft gestopt als de migratie niet kan worden opgeslagen.",
	temperatureMigrationComplete: "Temperatuurgegevens bijgewerkt en planner hervat",
	temperatureMigrationFailed: "Kan temperatuurgegevens niet bijwerken",
	temperatureLegacyResetQuestion: "Verouderde Celsius-gegevens resetten voor {target}?",
	temperatureLegacyResetExplanation: "Deze installatie is gemaakt met een Velair-versie die alleen Celsius-waarden opsloeg. Omdat Home Assistant nu {target} gebruikt, moet je Velair resetten om oude gegevens te verwijderen en veilige standaardwaarden met eenheden te maken. Bij toekomstige wijzigingen van de Home Assistant-eenheid wordt volledige gegevensconversie aangeboden.",
	temperatureLegacyResetStopped: "De planner is gestopt omdat deze oudere installatie alleen Celsius-gegevens bevat terwijl Home Assistant Fahrenheit gebruikt. Open de Velair-instellingen en gebruik Velair resetten om standaardwaarden in Fahrenheit te maken.",
	temperatureStep: "Stap",
	temperatureStepNotReported: "Niet gemeld door Home Assistant",
	temperatureStepNotReportedDescription: "Deze klimaatentiteit publiceert geen target_temp_step. Velair leidt zelf geen temperatuurstap af.",
	targetTemp: "Doeltemperatuur",
	targetHumidity: "Doelluchtvochtigheid",
	targetBy: "Doel om",
	targetTemperature: "Doeltemperatuur",
	todayTimeline: "Tijdlijn van vandaag",
	updateTemplate: "Sjabloon bijwerken",
	templateDeleted: "Sjabloon verwijderd",
	templateNameRequired: "Een sjabloonnaam is vereist",
	templateOptionalHint: "Kies een sjabloon of configureer het schema handmatig.",
	templateSaved: "Sjabloon opgeslagen",
	templates: "Sjablonen",
	thermostat: "Thermostaat",
	templatesPanelIntro: "Sjabloonbewerking komt hier, zodat schemabewerking overzichtelijk blijft.",
	time: "Tijd",
	timeline: "Tijdlijn",
	title: "Titel",
	unableApplyThermostats: "Kan schema niet op thermostaten toepassen",
	unableCopy: "Kan schema niet kopiëren",
	unableLoad: "Kan plannergegevens niet laden",
	unablePause: "Kan planner niet pauzeren",
	unableResume: "Kan planner niet hervatten",
	unableReset: "Kan Velair-gegevens niet resetten",
	unableSave: "Kan schema niet opslaan",
	unableSaveSettings: "Kan instellingen niet opslaan",
	unableDeleteTemplate: "Kan sjabloon niet verwijderen",
	unableExport: "Kan gegevens niet exporteren",
	unableSaveTemplate: "Kan sjabloon niet opslaan",
	unableSubscribe: "Abonneren op plannerupdates is mislukt",
	unsupportedModeForClimate: "{entity} ondersteunt {mode} niet om {start}. Zet dat blok op Behouden of kies een ondersteunde modus voordat je het toepast.",
	unsaved: "niet opgeslagen",
	waiting: "Wachten op plannergegevens",
	zoneOrder: "Thermostaatvolgorde",
	zonesManaged: "{count} zones beheerd",
	weekdays: {
		monday: "Maandag",
		tuesday: "Dinsdag",
		wednesday: "Woensdag",
		thursday: "Donderdag",
		friday: "Vrijdag",
		saturday: "Zaterdag",
		sunday: "Zondag"
	},
	schedulerStatuses: {
		idle: "Inactief",
		override_active: "Boost actief",
		paused: "Gepauzeerd",
		scheduled: "Gepland"
	},
	schedulerModes: {
		auto: "Automatisch",
		paused: "Gepauzeerd"
	},
	hvacModes: {
		auto: "Automatisch",
		cool: "Koelen",
		dry: "Drogen",
		fan_only: "Alleen ventilator",
		heat: "Verwarmen",
		heat_cool: "Verwarmen/koelen",
		off: "Uit"
	},
	hvacActions: {
		cooling: "Koelen",
		drying: "Drogen",
		fan: "Ventileren",
		heating: "Verwarmen",
		idle: "Inactief",
		off: "Uit",
		preheating: "Voorverwarmen",
		defrosting: "Ontdooien"
	}
}, pt = /* @__PURE__ */ t({ translationTemplate: () => mt }), mt = {
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
	activeSetupCardControls: "",
	activeSetupCardControlsBoth: "",
	activeSetupCardControlsDescription: "",
	activeSetupCardControlsModes: "",
	activeSetupCardControlsProfiles: "",
	cardViewOverviewBoosts: "",
	cardViewOverviewEvents: "",
	cardViewOverviewStatus: "",
	cardViewActiveSetup: "",
	cardViewOverviewTimeline: "",
	cardViewOverviewZones: "",
	cardViewComfort: "",
	cardViewPreconditioning: "",
	cardViewSchedules: "",
	cardViewSensors: "",
	cardThermostatHidden: "",
	cardThermostatVisible: "",
	cardThermostats: "",
	cardThermostatsDescription: "",
	comfortCardVisibility: "",
	comfortCardVisibilityDescription: "",
	comfortCardShowCo2: "",
	comfortCardShowConfiguration: "",
	comfortCardShowHumidity: "",
	comfortCardShowTemperature: "",
	roomAssistCardVisibility: "",
	roomAssistCardVisibilityDescription: "",
	roomAssistShowDebounce: "",
	roomAssistShowLiveStatus: "",
	roomAssistShowMaxDelta: "",
	roomAssistShowSensor: "",
	roomAssistShowSwitch: "",
	current: "",
	currentHumidity: "",
	currentTemperature: "",
	currentTime: "",
	clear: "",
	confirmDeleteTemplate: "",
	confirmTemplate: "",
	comfort: "",
	comfortAirQuality: "",
	comfortAirQualityElevated: "",
	comfortAirQualityGood: "",
	comfortAirQualityPoor: "",
	comfortAirQualityUnavailable: "",
	comfortAutomaticSourceValue: "",
	comfortCo2: "",
	comfortCo2Attention: "",
	comfortCo2Limits: "",
	comfortCo2LimitsHelp: "",
	comfortCo2Poor: "",
	comfortCo2Sensor: "",
	comfortCollapseClimate: "",
	comfortConditionCold: "",
	comfortConditionColdAndDry: "",
	comfortConditionColdAndHumid: "",
	comfortConditionComfortable: "",
	comfortConditionDry: "",
	comfortConditionHot: "",
	comfortConditionHotAndDry: "",
	comfortConditionHotAndHumid: "",
	comfortConditionHumid: "",
	comfortConditionHumidityComfortable: "",
	comfortConditionMonitoringOff: "",
	comfortConditionNoReadings: "",
	comfortConditionReadingsOutdated: "",
	comfortConditionTemperatureComfortable: "",
	comfortCooler: "",
	comfortCurrentReadings: "",
	comfortDataFreshness: "",
	comfortDataIssueCo2Missing: "",
	comfortDataIssueCo2Stale: "",
	comfortDataIssueHumidityMissing: "",
	comfortDataIssueHumidityStale: "",
	comfortDataIssueTemperatureMissing: "",
	comfortDataIssueTemperatureStale: "",
	comfortDataPartial: "",
	comfortDataStale: "",
	comfortDataUnavailable: "",
	comfortDisabledDetail: "",
	comfortDoNotMonitor: "",
	comfortDoNotMonitorHumidity: "",
	comfortDrier: "",
	comfortExpandClimate: "",
	comfortHumidity: "",
	comfortHumidityRange: "",
	comfortHumidityRangeHelp: "",
	comfortHumiditySensor: "",
	comfortIntroDetail: "",
	comfortIntroTitle: "",
	comfortMaximum: "",
	comfortMinimum: "",
	comfortMoreHumid: "",
	comfortMapCurrentPosition: "",
	comfortNotMonitored: "",
	comfortSelectSensor: "",
	comfortStaleAfter: "",
	comfortStaleAfterHelp: "",
	comfortTargetZone: "",
	comfortTemperature: "",
	comfortTemperatureRange: "",
	comfortTemperatureRangeHelp: "",
	comfortTemperatureSensor: "",
	comfortUnavailable: "",
	comfortWarmer: "",
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
	fanMode: "",
	horizontalSwingMode: "",
	entityDiagnosticOk: "",
	invalidStart: "",
	invalidTemperature: "",
	invalidTemperatureRange: "",
	invalidTemperatureStep: "",
	incompatibleScheduleTargets: "",
	incompatibleScheduleTargetsDescription: "",
	operationRecoveryRequired: "",
	operationRecoveryDescription: "",
	operationCancelled: "",
	operationCurrentZone: "",
	operationDefaultCompleted: "",
	operationDefaultFailed: "",
	operationDefaultPartial: "",
	operationDefaultRunning: "",
	operationDismiss: "",
	operationFailedHelp: "",
	operationFailureCount: "",
	operationFailureOne: "",
	operationModeCompleted: "",
	operationModeFailed: "",
	operationModePartial: "",
	operationModeRunning: "",
	operationNoZones: "",
	operationProfileCompleted: "",
	operationProfileFailed: "",
	operationProfilePartial: "",
	operationProfileRunning: "",
	operationProgress: "",
	operationProgressLabel: "",
	keep: "",
	keepMode: "",
	tagline: "",
	loading: "",
	loadingEntities: "",
	managedEntityAvailable: "",
	managedEntityMissing: "",
	managedEntitiesStatus: "",
	menu: "",
	minutesShort: "",
	secondsShort: "",
	providedData: "",
	profiles: "",
	profilesAndModes: "",
	activeSetup: "",
	activeSetupDescription: "",
	activeSetupChange: "",
	activeSetupModesHelp: "",
	activeSetupAppliedProfiles: "",
	activeSetupNoProfiles: "",
	activeSetupManualProfile: "",
	activeSetupManualProfileHelp: "",
	profilesPanelIntro: "",
	profileLibrarySelectorLabel: "",
	profilesLibraryDescription: "",
	profilesDescription: "",
	profileActive: "",
	profilesActive: "",
	profileActivate: "",
	profileBehaviorDefault: "",
	profileBehaviorPause: "",
	profileBehaviorSchedule: "",
	profileBlockAction: "",
	profileBrowseIcons: "",
	profileConfirmDelete: "",
	profileConfirmDeleteActive: "",
	profileColor: "",
	profileColorHelp: "",
	profileCopyTemplate: "",
	profileCreate: "",
	profileDelete: "",
	profileDeleted: "",
	profileDescription: "",
	profileDescriptionCharactersRemaining: "",
	profileDescriptionTooLong: "",
	profileDiscardChanges: "",
	profileCollapseClimate: "",
	profileExpandClimate: "",
	profileIcon: "",
	profileIconHelp: "",
	profileActiveContext: "",
	modeBuiltInHelp: "",
	modeInformation: "",
	modeChooseProfile: "",
	modeConfirmDelete: "",
	modeCreate: "",
	modeDelete: "",
	modeDeleted: "",
	modeDiscardChanges: "",
	modeDefault: "",
	modeDefaultDescription: "",
	modeManual: "",
	modeManualDescription: "",
	modeCustomDescription: "",
	modeChange: "",
	modeLabel: "",
	modeMappedProfile: "",
	modeMappedProfileMissing: "",
	modeMappedProfiles: "",
	modeName: "",
	modeNameDuplicate: "",
	modeNameHelp: "",
	modeNameRequired: "",
	modeNameTooLong: "",
	modeProfile: "",
	modeProfiles: "",
	modeProfileHelp: "",
	modeProfileRequired: "",
	modeSaved: "",
	modeSelectToBegin: "",
	modeUnableDelete: "",
	modeUnableActivate: "",
	modeUnableSave: "",
	modesDescription: "",
	modesLibraryDescription: "",
	modesEntityNote: "",
	modesTitle: "",
	profilesActiveCount: "",
	profileId: "",
	profileIdReadonlyHelp: "",
	profileInvalidIcon: "",
	profileInvalidColor: "",
	profileInvalidSchedule: "",
	profileName: "",
	profileNameRequired: "",
	profileNewName: "",
	profileNoDescription: "",
	profileNoneCreated: "",
	profileDefaultDescription: "",
	profileOverviewLabel: "",
	profilePauseAction: "",
	profilePauseKeep: "",
	profilePauseTurnOff: "",
	profileRemovedElsewhere: "",
	profileSaved: "",
	profileSelectToBegin: "",
	profileUnableActivate: "",
	profileUnableDelete: "",
	profileZoneBehavior: "",
	portability: "",
	portabilityDescription: "",
	portabilityFileReady: "",
	portabilityIncluded: "",
	portabilitySettingsSection: "",
	portabilityTemplatesSection: "",
	portabilityZonesSection: "",
	portabilityPreconditioningLearningSection: "",
	portabilityProfilesSection: "",
	portabilityModesSection: "",
	preconditioningImportSkipped: "",
	portableExported: "",
	portableImported: "",
	importData: "",
	importFile: "",
	chooseFile: "",
	climateOptions: "",
	climateOptionsAdd: "",
	noFileSelected: "",
	exportData: "",
	invalidImportFile: "",
	importOverwriteWarning: "",
	noImportSections: "",
	legacyImportTemperatureUnit: "",
	notSet: "",
	maintenance: "",
	maintenanceDescription: "",
	frontendBuild: "",
	portableFormatVersion: "",
	internalStorageVersion: "",
	integrationVersion: "",
	resetVelair: "",
	resetVelairDescription: "",
	confirmReset: "",
	confirmResetPreconditioningLearning: "",
	confirmResetPreconditioningSettings: "",
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
	overviewZoneApplied: "",
	overviewZoneAir: "",
	overviewZoneBoost: "",
	overviewZoneComfort: "",
	overviewZoneManual: "",
	overviewZonePaused: "",
	overviewZonePreconditioning: "",
	overviewZoneResumes: "",
	overviewZoneRoom: "",
	overviewZoneRoomAssist: "",
	overviewZoneScheduled: "",
	overviewZoneSensorIssue: "",
	overviewZoneTarget: "",
	overviewZoneUntil: "",
	overviewZoneUntilResumed: "",
	overviewZoneReadyAt: "",
	overviewZoneNextAt: "",
	overviewZoneAutomationOff: "",
	overviewZoneRoomAssistThermalFlow: "",
	overviewZoneSensor: "",
	overviewZoneClimate: "",
	overviewZoneTemperature: "",
	overviewZoneSetpoint: "",
	overviewZoneScheduledSetpoint: "",
	overviewZoneOffset: "",
	overviewZoneRoomAssistActive: "",
	overviewZoneRoomAssistHolding: "",
	overviewZoneComfortLabel: "",
	overviewZoneAirLabel: "",
	overviewZoneDataLabel: "",
	pause: "",
	pauseActive: "",
	pauseApplied: "",
	pauseDuration: "",
	pauseFrom: "",
	pauseIndefinite: "",
	pauseRemaining: "",
	pauseTo: "",
	preconditioning: "",
	preconditioningEnabled: "",
	preconditioningCool: "",
	preconditioningCoolingFallbackLead: "",
	preconditioningDirectionSamples: "",
	preconditioningHeat: "",
	preconditioningHeatingFallbackLead: "",
	preconditioningDirectionStatus: "",
	preconditioningExpandClimate: "",
	preconditioningIntroDetail: "",
	preconditioningIntroTitle: "",
	preconditioningAdaptivePercentile: "",
	preconditioningAdaptivePercentileHelp: "",
	preconditioningCalculationCombined: "",
	preconditioningCalculationDetails: "",
	preconditioningCalculationFinalLead: "",
	preconditioningCalculationPartialFloor: "",
	preconditioningCalculationReachedEstimate: "",
	preconditioningCalculationRounded: "",
	preconditioningCalculationSampleCounts: "",
	preconditioningCalculationSamples: "",
	preconditioningComfortPercentile: "",
	preconditioningComfortPercentileHelp: "",
	preconditioningComfortPercentileLabel: "",
	preconditioningCollapseClimate: "",
	preconditioningFallbackInactive: "",
	preconditioningFallbackLabel: "",
	preconditioningFallbackLead: "",
	preconditioningFallbackMinutesPerDegree: "",
	preconditioningFallbackMinutesPerDegreeHelp: "",
	preconditioningHistorySize: "",
	preconditioningHistorySizeHelp: "",
	preconditioningHistory: "",
	preconditioningInvalidEvents: "",
	preconditioningLastSample: "",
	preconditioningLeadTime: "",
	preconditioningLearning: "",
	preconditioningLearningStatus: "",
	preconditioningLearningDisabled: "",
	preconditioningLearningMoreData: "",
	preconditioningLearningReady: "",
	preconditioningLimitedByMax: "",
	preconditioningLivePrediction: "",
	preconditioningLivePredictionHelp: "",
	preconditioningMaxLead: "",
	preconditioningMaxLeadHelp: "",
	preconditioningMaximumLabel: "",
	preconditioningMinimumDelta: "",
	preconditioningMinimumDeltaHelp: "",
	preconditioningMinStart: "",
	preconditioningMinStartHelp: "",
	preconditioningModelHistory: "",
	preconditioningModel: "",
	preconditioningModelInitial: "",
	preconditioningModelSource: "",
	preconditioningNextBlock: "",
	preconditioningNoUpcomingDirectionEvent: "",
	preconditioningNormalStart: "",
	preconditioningNotSupported: "",
	preconditioningPartialEvents: "",
	preconditioningPartialSamples: "",
	preconditioningPartialExpiry: "",
	preconditioningPartialExpiryHelp: "",
	preconditioningQualityComplete: "",
	preconditioningQualityInvalid: "",
	preconditioningQualityPartial: "",
	preconditioningRecencyDecay: "",
	preconditioningRecencyDecayHelp: "",
	preconditioningReachedEvents: "",
	preconditioningResetLearning: "",
	preconditioningLearningResetDone: "",
	preconditioningSimilarSamples: "",
	preconditioningSimilarSamplesHelp: "",
	preconditioningUnsupportedDirection: "",
	preconditioningOutdoorTemperatureEntity: "",
	preconditioningOutdoorTemperatureEntityHelp: "",
	preconditioningOutdoorContext: "",
	preconditioningOutdoorDisabled: "",
	preconditioningSelectOutdoorSensor: "",
	preconditioningResetSettings: "",
	preconditioningSettingsResetDone: "",
	preconditioningStarts: "",
	preconditioningTargetBy: "",
	preconditioningTiming: "",
	preconditioningUnavailable: "",
	preconditioningUseOutdoorTemperature: "",
	preconditioningUseOutdoorTemperatureHelp: "",
	resume: "",
	resumed: "",
	resizeEnd: "",
	resizeStart: "",
	schedulerControls: "",
	schedules: "",
	sensors: "",
	roomSensorAppliedTarget: "",
	roomSensorAssist: "",
	roomSensorAssistBadge: "",
	roomSensorAssistEnabled: "",
	roomSensorAssistHelp: "",
	roomSensorAssistDisabledDetail: "",
	roomSensorAssistDebounce: "",
	roomSensorAssistDebounceHelp: "",
	roomSensorAssistMaxDelta: "",
	roomSensorAssistMaxDeltaHelp: "",
	roomSensorAssistOffset: "",
	roomSensorAssistOffsetHelp: "",
	roomSensorAssistCorrectionValue: "",
	roomSensorAssistCorrectionActiveHelp: "",
	roomSensorAssistNoCorrection: "",
	roomSensorAssistNoCorrectionHelp: "",
	roomSensorBlockActiveSince: "",
	roomSensorBlockMode: "",
	roomSensorBlockScheduled: "",
	roomSensorBlockStartedEarly: "",
	roomSensorBlockTarget: "",
	roomSensorGapAboveTarget: "",
	roomSensorGapBelowTarget: "",
	roomSensorClimateTarget: "",
	roomSensorClimateTemperature: "",
	roomSensorCollapseClimate: "",
	roomSensorControl: "",
	roomSensorExpandClimate: "",
	roomSensorIntroDetail: "",
	roomSensorIntroTitle: "",
	roomSensorLiveStatus: "",
	roomSensorNoActiveBlock: "",
	roomSensorNoActiveBlockDetail: "",
	roomSensorNotConfigured: "",
	roomSensorRoomTemperature: "",
	roomSensorRemainingToTarget: "",
	roomSensorRemainingValue: "",
	roomSensorScheduledTarget: "",
	roomSensorSelectSensor: "",
	roomSensorStatusAssisting: "",
	roomSensorStatusBlocked: "",
	roomSensorStatusDisabled: "",
	roomSensorStatusHolding: "",
	roomSensorStatusIdle: "",
	roomSensorStatusNotConfigured: "",
	roomSensorStatusReady: "",
	roomSensorStatusUnavailable: "",
	roomSensorTemperatureEntity: "",
	roomSensorTemperatureEntityHelp: "",
	roomSensorTemperatureScale: "",
	roomSensorUnavailable: "",
	roomSensorValueUnavailable: "",
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
	startsAt: "",
	applyScheduleOnStartup: "",
	applyScheduleOnStartupDescription: "",
	start: "",
	status: "",
	stop: "",
	supportedFanModes: "",
	supportedHorizontalSwingModes: "",
	supportedPresetModes: "",
	supportedSwingModes: "",
	presetMode: "",
	swingMode: "",
	temp: "",
	temperatureRange: "",
	temperatureUnit: "",
	temperatureUnitManagedByHomeAssistant: "",
	temperatureMigrationRequired: "",
	temperatureMigrationStopped: "",
	temperatureMigrationQuestion: "",
	temperatureMigrationExplanation: "",
	temperatureMigrationUse: "",
	temperatureMigrationConfirm: "",
	temperatureMigrationComplete: "",
	temperatureMigrationFailed: "",
	temperatureLegacyResetQuestion: "",
	temperatureLegacyResetExplanation: "",
	temperatureLegacyResetStopped: "",
	temperatureStep: "",
	temperatureStepNotReported: "",
	temperatureStepNotReportedDescription: "",
	targetTemp: "",
	targetHumidity: "",
	targetBy: "",
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
		paused: ""
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
		off: "",
		preheating: "",
		defrosting: ""
	}
}, O = Object.fromEntries(Object.entries(/* @__PURE__ */ Object.assign({
	"./de.ts": rt,
	"./en.ts": at,
	"./es.ts": st,
	"./fr.ts": lt,
	"./nl.ts": dt,
	"./template.ts": pt,
	"./types.ts": /* @__PURE__ */ t({})
})).map(([e, t]) => {
	let n = e.match(/\.\/(.+)\.ts$/)?.[1] ?? "";
	return [n, t[n]];
}).filter(([e, t]) => !!(e && t && e !== "index" && e !== "template" && e !== "types")));
//#endregion
//#region src/velair/i18n.ts
function k(e) {
	let t = e?.locale?.language ?? e?.language ?? e?.selectedLanguage ?? "en", n = String(t).toLowerCase();
	return Object.keys(O).find((e) => n === e || n.startsWith(`${e}-`)) ?? "en";
}
function ht(e, t, n = {}) {
	let r = O[e][t] ?? O.en[t];
	if (typeof r != "string") return t;
	let i = r;
	return Object.entries(n).forEach(([e, t]) => {
		i = i.replaceAll(`{${e}}`, String(t));
	}), i;
}
function gt(e, t) {
	let n = O[e].weekdays, r = O.en.weekdays;
	return n[t] ?? r[t] ?? bt(t);
}
function _t(e, t) {
	return gt(e, t).slice(0, 3);
}
function vt(e, t, n) {
	let r = O[e][t], i = O.en[t];
	return r[n] ?? i[n] ?? yt(n);
}
function yt(e) {
	return e.split("_").filter(Boolean).map((e) => bt(e)).join(" ");
}
function bt(e) {
	return e && e[0].toUpperCase() + e.slice(1);
}
//#endregion
//#region src/velair/domain/climate.ts
function xt(e) {
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
		t?.fan_mode ?? null,
		t?.current_humidity ?? null,
		t?.humidity ?? null,
		t?.min_humidity ?? null,
		t?.max_humidity ?? null,
		t?.preset_mode ?? null,
		t?.preset_modes ?? [],
		t?.fan_modes ?? [],
		t?.swing_mode ?? null,
		t?.swing_modes ?? [],
		t?.swing_horizontal_mode ?? null,
		t?.swing_horizontal_modes ?? []
	]);
}
function St(e) {
	return e.replaceAll("_", "-");
}
function Ct(e, t) {
	let n = Ft(t) ? [41, 95] : [5, 35], r = Pt(e?.attributes?.min_temp, n[0]), i = Pt(e?.attributes?.max_temp, n[1]);
	return r >= i || It(r, i, t) ? n : [r, i];
}
function wt(e) {
	let t = Pt(e?.attributes?.target_temp_step, NaN);
	return Number.isFinite(t) && t > 0 ? t : void 0;
}
function Tt(e, t) {
	return t === void 0 || !Number.isFinite(t) || t <= 0 ? e : Math.round(Math.ceil(e / t - 1e-6) * t * 1e6) / 1e6;
}
function Et(e) {
	let t = e?.attributes?.hvac_modes;
	return Array.isArray(t) ? t.filter((e) => typeof e == "string") : [];
}
function Dt(e) {
	return Lt(e, "fan_modes");
}
function Ot(e) {
	return Lt(e, "preset_modes");
}
function kt(e) {
	return Lt(e, "swing_modes");
}
function At(e) {
	return Lt(e, "swing_horizontal_modes");
}
function jt(e) {
	let t = Pt(e?.attributes?.min_humidity, NaN), n = Pt(e?.attributes?.max_humidity, NaN);
	if (!Number.isFinite(t) && !Number.isFinite(n) && typeof e?.attributes?.humidity != "number") return;
	let r = Number.isFinite(t) ? t : 0, i = Number.isFinite(n) ? n : 100;
	return r < i ? [r, i] : void 0;
}
function Mt(e) {
	let t = new Set(e);
	return Je.filter((e) => t.has(e));
}
function Nt(e) {
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
	}), Array.isArray(t.swing_horizontal_modes) && t.swing_horizontal_modes.length && n.push({
		icon: "mdi:swap-horizontal",
		labelKey: "supportedHorizontalSwingModes"
	}), (typeof t.target_temp_low == "number" || typeof t.target_temp_high == "number") && n.push({
		icon: "mdi:thermometer-lines",
		labelKey: "temperatureRange"
	}), n;
}
function Pt(e, t) {
	let n = Number(e);
	return Number.isFinite(n) ? n : t;
}
function Ft(e) {
	return String(e ?? "").toUpperCase().includes("F");
}
function It(e, t, n) {
	return Ft(n) ? t <= 60 && e < 40 : !!n && (t > 60 || e > 40);
}
function Lt(e, t) {
	let n = e?.attributes?.[t];
	return Array.isArray(n) ? n.filter((e) => typeof e == "string") : [];
}
//#endregion
//#region src/velair/domain/settings.ts
function Rt(e) {
	let t = e.first_weekday ?? e.selected_weekday ?? "monday";
	return D.includes(t) ? t : "monday";
}
function zt(e) {
	let t = D.indexOf(e);
	return t <= 0 ? [...D] : [...D.slice(t), ...D.slice(0, t)];
}
function Bt(e, t = []) {
	let n = new Set(e), r = t.filter((e) => n.has(e)), i = e.filter((e) => !r.includes(e));
	return [...r, ...i];
}
function Vt(e, t) {
	let n = Bt(e, t.zone_order), r = t.entities?.filter(Boolean) ?? [];
	if (!r.length) return n;
	let i = new Set(r);
	return n.filter((e) => i.has(e));
}
function Ht(e) {
	return e.length ? [Math.min(...e.map(([e]) => e)), Math.max(...e.map(([, e]) => e))] : [5, 35];
}
function Ut(e) {
	let t = e.filter((e) => e !== void 0 && Number.isFinite(e) && e > 0);
	if (!(t.length !== e.length || !t.length)) return t.every((e) => Math.abs(e - t[0]) <= 1e-9) ? t[0] : void 0;
}
function Wt(e) {
	return e.toFixed(e % 1 == 0 ? 0 : 1);
}
function Gt(e, t, n) {
	let r = new Set(e);
	return n ? r.add(t) : r.delete(t), r;
}
//#endregion
//#region src/velair/controllers/card-context.ts
function A(e) {
	return e;
}
function Kt(e) {
	return e.currentTarget.value;
}
function qt(e) {
	return et.includes(e) || tt.includes(e);
}
function Jt(e, t, n) {
	return qt(e) ? e : qt(n) ? n : qt(t) ? t : "overview-status";
}
function Yt(e, t, n) {
	if (!t) return !1;
	if (!n) return !0;
	let r = Vt(e._data?.configured_entities ?? [], e._config);
	return r.length ? r.some((e) => xt(t.states?.[e]) !== xt(n.states?.[e])) : !1;
}
function Xt(e, t, n) {
	if (!t || !n || !e._data) return !1;
	let r = new Set(Vt(e._data.configured_entities, e._config));
	return Object.entries(e._data.zones).some(([e, i]) => {
		if (!r.has(e)) return !1;
		let a = i.preconditioning;
		if (!a?.enabled && !a?.room_sensor_assist_enabled) return !1;
		if (Zt(t, e) !== Zt(n, e)) return !0;
		let o = Qt(t, e) !== Qt(n, e);
		if (a?.room_sensor_assist_enabled && o) return !0;
		let s = a?.room_temperature_entity_id;
		if (a?.room_sensor_assist_enabled && s && t.states?.[s]?.state !== n.states?.[s]?.state) return !0;
		let c = a.use_outdoor_temperature ? a.outdoor_temperature_entity_id : null;
		return !!(c && t.states?.[c]?.state !== n.states?.[c]?.state);
	});
}
function Zt(e, t) {
	return e.states?.[t]?.attributes?.current_temperature ?? null;
}
function Qt(e, t) {
	return e.states?.[t]?.attributes?.temperature ?? null;
}
function $t(e) {
	return k(e.hass);
}
function en(e, t, n = {}) {
	return ht($t(e), t, n);
}
function tn(e, t) {
	return gt($t(e), t);
}
function nn(e, t) {
	return _t($t(e), t);
}
function rn(e, t, n) {
	return vt($t(e), t, n);
}
function an(e) {
	return Rt(e._config);
}
function on(e) {
	return zt(an(e));
}
function sn(e, t) {
	return Bt(t, e._config.zone_order);
}
function cn(e, t) {
	return Vt(t, e._config);
}
//#endregion
//#region src/velair/styles/base-styles.ts
var ln = u`
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
`, un = u`
.comfort-view {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.comfort-intro {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: 24px minmax(0, 1fr);
  padding: 2px 4px 4px;
}

.comfort-intro > ha-icon {
  --mdc-icon-size: 22px;
  color: var(--primary-color);
}

.comfort-intro > span {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.comfort-intro strong {
  color: var(--primary-text-color);
  font-size: 14px;
  line-height: 1.25;
}

.comfort-intro small {
  color: var(--secondary-text-color);
  font-size: 12px;
  line-height: 1.35;
}

.comfort-zone {
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  display: grid;
  min-width: 0;
  overflow: visible;
  position: relative;
}

.comfort-zone-heading {
  align-items: center;
  background: var(--card-background-color);
  border-bottom: 1px solid var(--divider-color);
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) auto;
  min-width: 0;
  padding: 12px;
}

.comfort-zone.collapsed .comfort-zone-heading {
  border-bottom: 0;
  border-radius: 8px;
}

.comfort-zone-toggle {
  align-items: center;
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  display: grid;
  gap: 8px;
  grid-template-columns: 20px minmax(0, 1fr);
  min-width: 0;
  padding: 0;
  text-align: left;
}

.comfort-zone-toggle:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 4px;
}

.comfort-zone-toggle:disabled {
  cursor: default;
}

.comfort-zone-toggle:disabled .comfort-expand-icon {
  color: var(--disabled-text-color);
  opacity: 0.45;
}

.comfort-expand-icon {
  color: var(--secondary-text-color);
}

.comfort-zone-toggle > ha-icon {
  --mdc-icon-size: 20px;
}

.comfort-zone-identity {
  display: grid;
  gap: 2px;
  min-width: 0;
  text-align: left;
}

.comfort-zone-identity strong,
.comfort-zone-identity span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comfort-zone-identity strong {
  color: var(--primary-text-color);
  font-size: 14px;
}

.comfort-zone-identity span {
  color: var(--secondary-text-color);
  font-size: 12px;
}

.comfort-zone-actions {
  align-items: center;
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
  justify-content: flex-end;
  min-width: 0;
}

.comfort-assessment-summary {
  align-items: center;
  display: flex;
  justify-content: flex-end;
  min-width: 0;
}

.comfort-assessment-line {
  align-items: center;
  display: flex;
  gap: 6px;
}

.comfort-condition-pill {
  border-radius: 999px;
  border: 1px solid var(--divider-color);
  color: var(--secondary-text-color);
  font-size: 0.76rem;
  font-weight: 700;
  padding: 4px 8px;
  white-space: nowrap;
}

.comfort-condition-pill.condition-comfortable,
.comfort-condition-pill.condition-temperature_comfortable,
.comfort-condition-pill.condition-humidity_comfortable,
.comfort-air-pill.air-good {
  border-color: color-mix(in srgb, var(--success-color, #43a047) 28%, var(--divider-color));
  color: var(--success-color, #43a047);
}

.comfort-condition-pill.condition-dry,
.comfort-condition-pill.condition-humid,
.comfort-condition-pill.condition-cold_and_dry,
.comfort-condition-pill.condition-cold_and_humid,
.comfort-condition-pill.condition-hot_and_dry,
.comfort-condition-pill.condition-hot_and_humid,
.comfort-air-pill.air-elevated {
  border-color: color-mix(in srgb, var(--warning-color, #f9ab00) 35%, var(--divider-color));
  color: var(--warning-color, #b26a00);
}

.comfort-condition-pill.condition-hot,
.comfort-air-pill.air-poor {
  border-color: color-mix(in srgb, var(--error-color, #d93025) 32%, var(--divider-color));
  color: var(--error-color, #d93025);
}

.comfort-condition-pill.condition-cold {
  border-color: color-mix(in srgb, var(--info-color, #039be5) 35%, var(--divider-color));
  color: var(--info-color, #0277bd);
}

.comfort-air-pill {
  border: 1px solid var(--divider-color);
  border-radius: 999px;
  color: var(--secondary-text-color);
  font-size: 0.76rem;
  font-weight: 700;
  padding: 4px 8px;
  white-space: nowrap;
}

.comfort-zone-content {
  border-top: 1px solid var(--divider-color);
  display: grid;
  gap: 12px;
  padding: 12px;
}

.comfort-assessment-card,
.comfort-config-section {
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  padding: 12px;
}

.comfort-assessment-card.idle {
  align-items: center;
  color: var(--secondary-text-color);
  display: flex;
  gap: 10px;
}

.comfort-assessment-heading {
  align-items: start;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 10px;
}

.comfort-assessment-heading > span {
  align-items: center;
  display: flex;
  gap: 6px;
}

.comfort-data-warning {
  align-items: center;
  color: var(--warning-color, #b26a00);
  cursor: help;
  display: inline-flex;
  position: relative;
}

.comfort-data-warning ha-icon {
  --mdc-icon-size: 17px;
}

.comfort-data-warning:hover .comfort-help-tooltip,
.comfort-data-warning:focus .comfort-help-tooltip,
.comfort-data-warning:focus-visible .comfort-help-tooltip {
  display: block;
}

.comfort-data-warning .comfort-help-tooltip {
  left: auto;
  max-width: min(260px, calc(100vw - 32px));
  overflow-wrap: anywhere;
  right: 0;
  text-align: left;
  transform: none;
  white-space: normal;
}

.comfort-visuals {
  display: grid;
  gap: 12px;
}

.comfort-map {
  display: grid;
  gap: 5px 8px;
  grid-template-columns: 64px minmax(0, 1fr);
  grid-template-rows: minmax(180px, 24vh) auto auto;
  min-width: 0;
}

.comfort-map-plot {
  background:
    linear-gradient(
      to bottom,
      color-mix(in srgb, var(--primary-color) 14%, transparent) 0%,
      transparent 42%,
      transparent 58%,
      color-mix(in srgb, var(--warning-color, #f9ab00) 14%, transparent) 100%
    ),
    linear-gradient(
      to right,
      color-mix(in srgb, var(--info-color, #039be5) 15%, transparent) 0%,
      transparent 42%,
      transparent 58%,
      color-mix(in srgb, var(--error-color, #d93025) 13%, transparent) 100%
    ),
    var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  min-height: 180px;
  overflow: hidden;
  position: relative;
}

.comfort-map-plot::before,
.comfort-map-plot::after {
  background: var(--divider-color);
  content: "";
  opacity: 0.65;
  pointer-events: none;
  position: absolute;
}

.comfort-map-plot::before {
  height: 1px;
  left: 0;
  right: 0;
  top: 50%;
}

.comfort-map-plot::after {
  bottom: 0;
  left: 50%;
  top: 0;
  width: 1px;
}

.comfort-map-zone {
  background: color-mix(in srgb, var(--success-color, #43a047) 7%, transparent);
  border: 1px solid color-mix(in srgb, var(--success-color, #43a047) 48%, var(--divider-color));
  border-radius: 5px;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--success-color, #43a047) 9%, transparent);
  inset: 33.333%;
  position: absolute;
  z-index: 1;
}

.comfort-map-regions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  inset: 0;
  position: absolute;
}

.comfort-map-regions > span {
  border: 1px solid color-mix(in srgb, var(--divider-color) 34%, transparent);
}

.comfort-map-marker {
  height: 12px;
  left: var(--comfort-x);
  position: absolute;
  top: var(--comfort-y);
  width: 12px;
  z-index: 3;
}

.comfort-map-marker-dot {
  background: var(--card-background-color);
  border: 2px solid var(--primary-text-color);
  border-radius: 50%;
  box-shadow:
    0 0 0 2px var(--card-background-color),
    0 1px 5px rgba(0, 0, 0, 0.32);
  display: block;
  height: 12px;
  position: absolute;
  transform: translate(-50%, -50%);
  width: 12px;
}

.comfort-map-marker-dot::after,
.comfort-scale-marker::after,
.comfort-legend-current::after {
  background: var(--primary-color);
  border-radius: 50%;
  content: "";
  inset: 3px;
  position: absolute;
}

.comfort-map-marker-label {
  align-items: center;
  background: var(--card-background-color);
  border: 1px solid color-mix(in srgb, var(--primary-color) 45%, var(--divider-color));
  border-radius: 5px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.16);
  color: var(--primary-text-color);
  display: flex;
  gap: 5px;
  left: 0;
  padding: 4px 6px;
  position: absolute;
  bottom: 20px;
  transform: translateX(-50%);
  white-space: nowrap;
  z-index: 2;
}

.comfort-map-marker-label::after {
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid var(--card-background-color);
  content: "";
  left: 50%;
  position: absolute;
  top: 100%;
  transform: translateX(-50%);
}

.comfort-map-marker.label-below .comfort-map-marker-label {
  bottom: auto;
  top: 20px;
}

.comfort-map-marker.label-below .comfort-map-marker-label::after {
  border-bottom: 5px solid var(--card-background-color);
  border-top: 0;
  bottom: 100%;
  top: auto;
}

.comfort-map-marker.label-left .comfort-map-marker-label {
  transform: translateX(-8px);
}

.comfort-map-marker.label-left .comfort-map-marker-label::after {
  left: 8px;
}

.comfort-map-marker.label-right .comfort-map-marker-label {
  left: auto;
  right: 8px;
  transform: none;
}

.comfort-map-marker.label-right .comfort-map-marker-label::after {
  left: auto;
  right: 0;
}

.comfort-map-marker-label strong {
  font-size: 0.78rem;
}

.comfort-map-marker-label small {
  color: var(--secondary-text-color);
  font-size: 0.72rem;
}

.comfort-map-axis {
  color: var(--secondary-text-color);
  display: flex;
  font-size: 0.7rem;
  justify-content: space-between;
}

.comfort-map-axis-y {
  align-items: flex-end;
  flex-direction: column;
  grid-column: 1;
  grid-row: 1;
  text-align: right;
}

.comfort-map-axis-x {
  grid-column: 2;
  grid-row: 2;
}

.comfort-map-legend {
  align-items: center;
  color: var(--secondary-text-color);
  display: flex;
  flex-wrap: wrap;
  font-size: 0.7rem;
  gap: 5px 14px;
  grid-column: 2;
  grid-row: 3;
  justify-content: center;
  padding-top: 2px;
  text-align: center;
}

.comfort-map-legend > span {
  align-items: center;
  display: inline-flex;
  gap: 6px;
}

.comfort-legend-zone {
  background: color-mix(in srgb, var(--success-color, #43a047) 7%, transparent);
  border: 1px solid color-mix(in srgb, var(--success-color, #43a047) 48%, var(--divider-color));
  border-radius: 3px;
  box-sizing: border-box;
  display: inline-block;
  height: 10px;
  width: 14px;
}

.comfort-legend-current {
  background: var(--card-background-color);
  border: 2px solid var(--primary-text-color);
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--card-background-color);
  box-sizing: border-box;
  display: inline-block;
  height: 12px;
  position: relative;
  width: 12px;
}

.comfort-range-scale,
.comfort-co2-scale {
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  display: grid;
  gap: 8px;
  padding: 12px;
}

.comfort-range-scale header,
.comfort-co2-scale header {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.comfort-range-scale header span,
.comfort-co2-scale header span {
  color: var(--secondary-text-color);
  font-size: 0.78rem;
  font-weight: 700;
}

.comfort-scale-track,
.comfort-co2-track {
  border-radius: 999px;
  height: 10px;
  position: relative;
}

.comfort-range-scale.metric-temperature .comfort-scale-track {
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--info-color, #039be5) 72%, var(--divider-color)) 0%,
    color-mix(in srgb, var(--info-color, #039be5) 72%, var(--divider-color)) 30%,
    var(--success-color, #43a047) 36%,
    var(--success-color, #43a047) 64%,
    color-mix(in srgb, var(--error-color, #d93025) 66%, var(--divider-color)) 70%,
    color-mix(in srgb, var(--error-color, #d93025) 66%, var(--divider-color)) 100%
  );
}

.comfort-range-scale.metric-humidity .comfort-scale-track {
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--warning-color, #f9ab00) 74%, var(--divider-color)) 0%,
    color-mix(in srgb, var(--warning-color, #f9ab00) 74%, var(--divider-color)) 30%,
    var(--success-color, #43a047) 36%,
    var(--success-color, #43a047) 64%,
    color-mix(in srgb, var(--primary-color) 62%, var(--divider-color)) 70%,
    color-mix(in srgb, var(--primary-color) 62%, var(--divider-color)) 100%
  );
}

.comfort-scale-marker {
  background: var(--card-background-color);
  border: 2px solid var(--primary-text-color);
  border-radius: 50%;
  box-shadow:
    0 0 0 2px var(--card-background-color),
    0 1px 4px rgba(0, 0, 0, 0.35);
  height: 14px;
  left: var(--comfort-position);
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  z-index: 2;
}

.comfort-range-limits,
.comfort-co2-scale footer {
  color: var(--secondary-text-color);
  font-size: 0.7rem;
}

.comfort-range-limits {
  min-height: 1em;
  position: relative;
}

.comfort-range-limits span {
  position: absolute;
  transform: translateX(-50%);
  white-space: nowrap;
}

.comfort-range-limits span:first-child {
  left: 33.333%;
}

.comfort-range-limits span:last-child {
  left: 66.666%;
}

.comfort-co2-scale footer {
  display: flex;
  justify-content: space-between;
}

.comfort-co2-track {
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--success-color, #43a047) 70%, var(--divider-color)) 0%,
    color-mix(in srgb, var(--success-color, #43a047) 70%, var(--divider-color)) calc(var(--comfort-attention) - 3%),
    var(--warning-color, #f9ab00) calc(var(--comfort-attention) + 3%),
    var(--warning-color, #f9ab00) calc(var(--comfort-poor) - 3%),
    var(--error-color, #d93025) calc(var(--comfort-poor) + 3%),
    var(--error-color, #d93025) 100%
  );
  overflow: visible;
}

.comfort-no-readings {
  align-items: center;
  background: var(--card-background-color);
  border: 1px dashed var(--divider-color);
  border-radius: 8px;
  color: var(--secondary-text-color);
  display: flex;
  gap: 8px;
  justify-content: center;
  min-height: 96px;
  padding: 12px;
}

.comfort-no-readings ha-icon {
  --mdc-icon-size: 20px;
}

.comfort-config-section h3 {
  align-items: center;
  display: flex;
  font-size: 0.9rem;
  gap: 6px;
  margin: 0 0 10px;
}

.comfort-config-section h3 ha-icon {
  color: var(--primary-color);
}

.comfort-config-rows {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.comfort-config-row {
  align-items: start;
  display: grid;
  gap: 6px;
  min-width: 0;
}

.comfort-config-label {
  align-items: center;
  color: var(--secondary-text-color);
  display: flex;
  font-size: 0.78rem;
  font-weight: 700;
  gap: 5px;
}

.comfort-help {
  align-items: center;
  cursor: help;
  display: inline-flex;
  position: relative;
}

.comfort-help ha-icon {
  --mdc-icon-size: 16px;
}

.comfort-help-tooltip {
  background: var(--primary-text-color);
  border-radius: 6px;
  bottom: calc(100% + 8px);
  box-sizing: border-box;
  color: var(--card-background-color);
  display: none;
  font-size: 0.76rem;
  font-weight: 500;
  left: auto;
  line-height: 1.35;
  max-width: min(260px, calc(100vw - 32px));
  overflow-wrap: anywhere;
  padding: 7px 9px;
  position: absolute;
  right: 0;
  text-align: left;
  transform: none;
  white-space: normal;
  width: max-content;
  z-index: 20;
}

.comfort-help:hover .comfort-help-tooltip,
.comfort-help:focus .comfort-help-tooltip,
.comfort-help:focus-visible .comfort-help-tooltip {
  display: block;
}

.comfort-selected-entity {
  color: var(--secondary-text-color);
  display: block;
  min-height: 1.15rem;
  margin-top: 3px;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  padding-left: 1px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comfort-select-wrap {
  display: grid;
  min-width: 0;
}

.comfort-select-wrap::after,
.comfort-select-wrap:has(select:open)::after {
  display: none;
}

.comfort-select-control {
  display: block;
  min-width: 0;
  position: relative;
}

.comfort-select-control select {
  width: 100%;
}

.comfort-select-control::after {
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

.comfort-select-control:has(select:open)::after {
  transform: translateY(-28%) rotate(225deg);
}

.comfort-number-pair,
.comfort-number-single {
  align-items: center;
  display: flex;
  gap: 6px;
}

.comfort-number-pair {
  align-items: end;
}

.comfort-number-separator {
  align-items: center;
  align-self: end;
  color: var(--secondary-text-color);
  display: inline-flex;
  height: 34px;
  justify-content: center;
}

.comfort-number-field {
  display: grid;
  gap: 3px;
}

.comfort-number-field small,
.comfort-number-unit,
.comfort-number-single-unit {
  color: var(--secondary-text-color);
  font-size: 0.78rem;
  font-weight: 700;
}

.comfort-number-unit,
.comfort-number-single-unit {
  align-items: center;
  align-self: end;
  display: inline-flex;
  min-height: 34px;
}

.comfort-number-pair input,
.comfort-number-single input {
  min-width: 0;
  width: 76px;
}

.comfort-number-single .comfort-number-field {
  flex: 0 0 auto;
}

@media (min-width: 681px) {
  .comfort-metric-config-section .comfort-config-rows {
    align-items: start;
    column-gap: 24px;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
    row-gap: 8px;
  }

  .comfort-metric-config-section .comfort-number-pair {
    align-items: center;
    flex-wrap: wrap;
    min-height: 34px;
    min-width: 0;
  }

  .comfort-metric-config-section .comfort-number-field {
    align-items: center;
    display: flex;
    gap: 6px;
    min-width: 0;
  }

  .comfort-metric-config-section .comfort-number-field small {
    flex: 0 0 auto;
  }

  .comfort-metric-config-section .comfort-number-separator,
  .comfort-metric-config-section .comfort-number-unit {
    align-self: center;
  }
}

@media (max-width: 680px) {
  .comfort-zone-heading {
    align-items: center;
  }

  .comfort-assessment-heading {
    display: grid;
  }

  .comfort-zone-actions {
    gap: 5px;
  }

  .comfort-assessment-line {
    gap: 4px;
  }

  .comfort-air-pill,
  .comfort-condition-pill {
    max-width: 130px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .comfort-map {
    grid-template-columns: 58px minmax(0, 1fr);
    grid-template-rows: 180px auto auto;
  }

  .comfort-config-rows {
    grid-template-columns: 1fr;
  }

  .comfort-config-row,
  .comfort-number-pair,
  .comfort-number-single {
    width: 100%;
  }

  .comfort-number-field {
    flex: 1 1 0;
  }

  .comfort-number-pair input,
  .comfort-number-single input {
    width: 100%;
  }
}
`, dn = u`
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
`, fn = u`
  .operation-status {
    --operation-status-color: var(--primary-color);
    align-items: center;
    background: color-mix(in srgb, var(--operation-status-color) 9%, var(--card-background-color));
    border: 1px solid color-mix(in srgb, var(--operation-status-color) 42%, var(--divider-color));
    border-radius: 8px;
    box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0, 0, 0, 0.12));
    box-sizing: border-box;
    display: grid;
    gap: 8px 10px;
    grid-template-columns: 24px minmax(0, 1fr) auto;
    margin-bottom: 12px;
    overflow: hidden;
    padding: 10px 12px 8px;
    position: sticky;
    top: var(--velair-operation-sticky-top, 8px);
    z-index: 20;
  }

  .operation-status.completed {
    --operation-status-color: var(--success-color, #2e7d32);
  }

  .operation-status.completed_with_errors {
    --operation-status-color: var(--warning-color, #f9a825);
  }

  .operation-status.failed {
    --operation-status-color: var(--error-color, #c62828);
  }

  .operation-status-icon {
    align-items: center;
    color: var(--operation-status-color);
    display: flex;
    height: 24px;
    justify-content: center;
    width: 24px;
  }

  .operation-status-icon ha-icon {
    --mdc-icon-size: 21px;
  }

  .operation-status-spinner {
    animation: velair-operation-spin 800ms linear infinite;
    border: 2px solid color-mix(in srgb, var(--operation-status-color) 24%, transparent);
    border-radius: 999px;
    border-top-color: var(--operation-status-color);
    box-sizing: border-box;
    height: 18px;
    width: 18px;
  }

  .operation-status-copy {
    min-width: 0;
  }

  .operation-status-copy strong,
  .operation-status-copy span {
    display: block;
  }

  .operation-status-copy strong {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.25;
  }

  .operation-status-copy span {
    color: var(--secondary-text-color);
    font-size: 12px;
    line-height: 1.35;
    margin-top: 2px;
    overflow-wrap: anywhere;
  }

  .operation-status-count {
    color: var(--secondary-text-color);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }

  .operation-status-actions {
    align-items: center;
    display: flex;
    gap: 6px;
  }

  .operation-status-dismiss {
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: 999px;
    color: var(--secondary-text-color);
    cursor: pointer;
    display: inline-flex;
    height: 32px;
    justify-content: center;
    padding: 0;
    width: 32px;
  }

  .operation-status-dismiss:hover,
  .operation-status-dismiss:focus-visible {
    background: color-mix(in srgb, var(--operation-status-color) 14%, transparent);
    color: var(--primary-text-color);
  }

  .operation-status-dismiss ha-icon {
    --mdc-icon-size: 18px;
  }

  .operation-status-progress {
    background: color-mix(in srgb, var(--operation-status-color) 16%, var(--card-background-color));
    border-radius: 999px;
    grid-column: 1 / -1;
    height: 3px;
    overflow: hidden;
  }

  .operation-status-progress > span {
    background: var(--operation-status-color);
    display: block;
    height: 100%;
    transition: width 180ms ease;
  }

  @keyframes velair-operation-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .operation-status-spinner {
      animation: none;
    }

    .operation-status-progress > span {
      transition: none;
    }
  }

  @container (max-width: 480px) {
    .operation-status {
      grid-template-columns: 22px minmax(0, 1fr) auto;
      padding-inline: 10px;
    }
  }
`, pn = u`
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
  gap: 14px;
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

.overview-empty-state {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: 28px minmax(0, 1fr);
  min-width: 0;
}

.overview-empty-state > ha-icon {
  --mdc-icon-size: 20px;
  color: var(--primary-color);
  justify-self: center;
}

.overview-empty-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.overview-climate-name {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
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
  --overview-timeline-name-column: 168px;
  display: grid;
  grid-template-columns: var(--overview-timeline-name-column) minmax(480px, 1fr);
  min-width: calc(var(--overview-timeline-name-column) + 480px);
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
  align-items: center;
  color: var(--secondary-text-color);
  display: inline-flex;
  flex: 0 0 auto;
  height: 100%;
  justify-content: center;
  line-height: 1;
}

.overview-timeline-name .overview-climate-name { align-items: center; display: inline-flex; height: 100%; line-height: 1.2; }

.overview-timeline-name.paused {
  color: var(--secondary-text-color);
}

.overview-timeline-name.paused ha-icon {
  color: var(--warning-color, #c99500);
}

.overview-timeline-name.profiled ha-icon {
  color: var(--overview-profile-accent, var(--primary-color));
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
  background: color-mix(in srgb, var(--card-background-color) 92%, transparent);
  bottom: 0;
  color: var(--secondary-text-color);
  display: flex;
  font-size: 12px;
  left: 10px;
  padding: 0 10px;
  position: absolute;
  top: 0;
  width: max-content;
  z-index: 6;
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

.overview-zone-cards { display: grid; gap: 10px; }
.overview-zone-card { background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 8px; container-name: overview-zone-card; container-type: inline-size; display: grid; gap: 10px; padding: 12px; }
.overview-zone-profile { align-items: center; background: var(--secondary-background-color); border: 1px solid var(--overview-profile-accent, var(--primary-color)); border-radius: 8px; box-sizing: border-box; display: inline-flex; flex: 0 1 auto; gap: 7px; max-width: 100%; min-height: 28px; min-width: 0; overflow: hidden; padding: 0 9px 0 0; }
.overview-zone-profile-accent { align-items: center; align-self: stretch; background: var(--overview-profile-accent, var(--primary-color)); color: white; display: inline-flex; flex: 0 0 auto; gap: 5px; justify-content: center; padding: 4px 8px; }
.overview-zone-profile ha-icon { --mdc-icon-size: 17px; align-items: center; display: inline-flex; justify-content: center; line-height: 1; }
.overview-zone-profile small { color: inherit; font-size: 10px; font-weight: 600; letter-spacing: .02em; line-height: 1; }
.overview-zone-profile strong { color: var(--primary-text-color); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.overview-zone-card-heading { align-items: start; display: grid; gap: 12px; grid-template-columns: minmax(150px, .75fr) minmax(0, 1.5fr) minmax(160px, 220px); min-width: 0; }
.overview-zone-card-name { display: grid; gap: 2px; min-width: 0; }
.overview-zone-card-name strong, .overview-zone-card-name span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.overview-zone-card-name span { color: var(--secondary-text-color); font-size: 11px; }
.overview-zone-activity { align-items: center; align-self: start; box-sizing: border-box; display: grid; gap: 8px; grid-column: 3; grid-template-columns: 32px minmax(0, max-content); justify-self: end; max-width: 220px; min-width: 0; width: fit-content; }
.overview-zone-activity-copy { display: grid; gap: 1px; min-width: 0; }
.overview-zone-activity-copy strong, .overview-zone-activity-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.overview-zone-activity-summary { align-items: baseline; display: flex; flex-wrap: wrap; font-size: 12px; gap: 0 4px; line-height: 1.3; min-width: 0; }
.overview-zone-activity-summary strong { font-size: 13px; font-weight: 600; line-height: inherit; }
.overview-zone-activity-context,
.overview-zone-activity-separator { color: var(--secondary-text-color); font-size: 12px; line-height: inherit; }
.overview-zone-activity-detail { color: var(--secondary-text-color); font-size: 11px; line-height: 1.25; }
.overview-zone-activity-icon { align-items: center; background: color-mix(in srgb, var(--primary-color) 10%, transparent); border-radius: 9px; color: var(--primary-color); display: inline-flex; height: 32px; justify-content: center; width: 32px; }
.overview-zone-activity-icon ha-icon { --mdc-icon-size: 18px; }
.overview-zone-activity.state-boost .overview-zone-activity-icon { background: color-mix(in srgb, var(--warning-color, #f9a825) 12%, transparent); color: var(--warning-color, #f9a825); }
.overview-zone-activity.state-paused .overview-zone-activity-icon,
.overview-zone-activity.state-stopped .overview-zone-activity-icon,
.overview-zone-activity.state-idle .overview-zone-activity-icon { background: color-mix(in srgb, var(--secondary-text-color) 10%, transparent); color: var(--secondary-text-color); }
.overview-zone-activity.action-heating .overview-zone-activity-icon { background: color-mix(in srgb, var(--deep-orange-color, #e65100) 12%, transparent); color: var(--deep-orange-color, #e65100); }
.overview-zone-activity.action-cooling .overview-zone-activity-icon { background: color-mix(in srgb, var(--info-color, #0277bd) 12%, transparent); color: var(--info-color, #0277bd); }
.overview-zone-activity.action-drying .overview-zone-activity-icon,
.overview-zone-activity.action-fan .overview-zone-activity-icon { background: color-mix(in srgb, var(--primary-color) 10%, transparent); color: var(--primary-color); }
.overview-zone-activity.action-idle .overview-zone-activity-icon,
.overview-zone-activity.action-off .overview-zone-activity-icon { background: color-mix(in srgb, var(--secondary-text-color) 10%, transparent); color: var(--secondary-text-color); }
.overview-zone-details { background: var(--secondary-background-color); border: 1px solid var(--divider-color); border-radius: 7px; min-width: 0; padding: 7px 9px; }
.overview-zone-metrics { display: flex; flex-wrap: wrap; gap: 6px; }
.overview-zone-metric { border-right: 1px solid var(--divider-color); display: grid; gap: 2px; min-width: 66px; padding: 1px 12px 1px 2px; }
.overview-zone-metric:last-child { border-right: 0; padding-right: 2px; }
.overview-zone-metric small { color: var(--secondary-text-color); font-size: 11px; text-transform: uppercase; }
.overview-zone-metric strong { font-size: 18px; }
.overview-assist-flow { align-items: stretch; display: flex; flex-wrap: wrap; gap: 6px; }
.overview-assist-group { border-right: 1px solid var(--divider-color); display: grid; gap: 5px; padding: 1px 14px 1px 2px; }
.overview-assist-group > small, .overview-assist-offset small { color: var(--secondary-text-color); font-size: 10px; text-transform: uppercase; }
.overview-assist-group > div { display: flex; gap: 14px; }
.overview-assist-metric, .overview-assist-offset { display: grid; gap: 2px; }
.overview-assist-offset { align-content: end; border-right: 1px solid var(--divider-color); padding: 1px 14px 1px 2px; }
.overview-assist-flow > :last-child { border-right: 0; padding-right: 2px; }
.overview-assist-metric small { color: var(--secondary-text-color); font-size: 10px; text-transform: uppercase; }
.overview-assist-metric strong { font-size: 15px; }
.overview-assist-offset strong { font-size: 15px; }
.overview-zone-signals { align-items: center; display: flex; flex-wrap: wrap; gap: 10px; min-width: 0; overflow: visible; white-space: normal; }
.overview-zone-signals:empty { display: none; }
.overview-zone-signal {
  align-items: center;
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  display: inline-flex;
  flex: 0 0 auto;
  gap: 5px;
  padding: 3px 7px 3px 5px;
  white-space: nowrap;
}
.overview-zone-signal > span { align-items: baseline; display: flex; gap: 3px; line-height: 1.3; min-width: 0; }
.overview-zone-signal small { color: var(--secondary-text-color); font-size: 12px; line-height: inherit; }
.overview-zone-signal strong { font-size: 12px; line-height: inherit; overflow: hidden; text-overflow: ellipsis; }
.overview-zone-signal ha-icon {
  --mdc-icon-size: 16px;
  align-items: center;
  align-self: center;
  color: var(--secondary-text-color);
  display: inline-flex;
  flex: 0 0 20px;
  height: 20px;
  justify-content: center;
  line-height: 0;
  transform: translateY(-1px);
  width: 20px;
}
.overview-zone-signal.room-assist {
  background: color-mix(in srgb, var(--info-color, #039be5) 9%, var(--card-background-color));
  border-color: color-mix(in srgb, var(--info-color, #039be5) 38%, var(--divider-color));
}
.overview-zone-signal.room-assist ha-icon { color: var(--info-color, #039be5); }
.overview-zone-signal.comfort-environment {
  background: color-mix(in srgb, var(--success-color, #43a047) 9%, var(--card-background-color));
  border-color: color-mix(in srgb, var(--success-color, #43a047) 38%, var(--divider-color));
}
.overview-zone-signal.comfort-environment ha-icon { color: var(--success-color, #43a047); }
.overview-zone-signal.comfort-air {
  background: color-mix(in srgb, var(--cyan-color, #00897b) 9%, var(--card-background-color));
  border-color: color-mix(in srgb, var(--cyan-color, #00897b) 38%, var(--divider-color));
}
.overview-zone-signal.comfort-air ha-icon { color: var(--cyan-color, #00897b); }
.overview-zone-signal.comfort-data {
  background: color-mix(in srgb, var(--warning-color, #f9a825) 9%, var(--card-background-color));
  border-color: color-mix(in srgb, var(--warning-color, #f9a825) 38%, var(--divider-color));
}
.overview-zone-signal.comfort-data ha-icon { color: var(--warning-color, #f9a825); }
.overview-zone-signal.warning {
  background: color-mix(in srgb, var(--warning-color, #f9a825) 10%, var(--card-background-color));
  border-color: color-mix(in srgb, var(--warning-color, #f9a825) 45%, var(--divider-color));
}
.overview-zone-signal.warning ha-icon { color: var(--warning-color, #f9a825); }
.overview-zone-signal.error {
  background: color-mix(in srgb, var(--error-color, #d93025) 10%, var(--card-background-color));
  border-color: color-mix(in srgb, var(--error-color, #d93025) 45%, var(--divider-color));
}
.overview-zone-signal.error ha-icon { color: var(--error-color, #d93025); }
@container overview-zone-card (max-width: 1120px) {
  .overview-zone-card-heading { grid-template-columns: minmax(0, 1fr) minmax(120px, 220px); }
  .overview-zone-card-name { grid-column: 1; grid-row: 1; }
  .overview-zone-activity { grid-column: 2; grid-row: 1; max-width: 220px; }
  .overview-zone-signals { grid-column: 1 / -1; grid-row: 2; }
  .overview-zone-signal strong { overflow: visible; text-overflow: clip; }
}
@media (max-width: 1200px) {
  .overview-zone-card-heading { grid-template-columns: minmax(0, 1fr) minmax(120px, 220px); }
  .overview-zone-card-name { grid-column: 1; grid-row: 1; }
  .overview-zone-activity { grid-column: 2; grid-row: 1; max-width: 220px; }
  .overview-zone-signals { grid-column: 1 / -1; grid-row: 2; }
  .overview-zone-signal strong { overflow: visible; text-overflow: clip; }
}
@container overview-zone-card (max-width: 600px) {
  .overview-zone-card-heading { grid-template-columns: minmax(0, 1fr) minmax(120px, 46%); }
  .overview-zone-card-name { grid-column: 1; grid-row: 1; }
  .overview-zone-activity { grid-column: 2; grid-row: 1; grid-template-columns: 32px minmax(0, 1fr); justify-self: end; max-width: 100%; width: 100%; }
  .overview-zone-signals { gap: 7px; margin: 3px 0; padding: 2px 0; }
}
@media (max-width: 600px) {
  .overview-zone-card-heading { grid-template-columns: minmax(0, 1fr) minmax(120px, 46%); }
  .overview-zone-card-name { grid-column: 1; grid-row: 1; }
  .overview-zone-activity { grid-column: 2; grid-row: 1; grid-template-columns: 32px minmax(0, 1fr); justify-self: end; max-width: 100%; width: 100%; }
  .overview-zone-signals { gap: 7px; margin: 3px 0; padding: 2px 0; }
  .overview-zone-profile { max-width: 100%; }
  .overview-zone-details { padding: 6px 8px; }
  .overview-zone-metric, .overview-assist-group, .overview-assist-offset { padding-right: 9px; }
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
  justify-content: center;
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
  margin-top: 14px;
  padding-inline-start: 2px;
}

.next .event {
  box-sizing: border-box;
  min-width: calc(150px + 62ch + 24px);
  width: 100%;
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

.next .event-details,
.next .event-details.preconditioned {
  grid-template-columns: 42ch 8ch 12ch;
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

.next .event-time {
  align-items: center;
  display: flex;
  justify-content: flex-end;
  overflow: visible;
  width: 100%;
}

.event-time-flow {
  align-items: center;
  display: inline-flex;
  gap: 6px;
  justify-content: flex-end;
  overflow: visible;
  white-space: nowrap;
}

.event-time-sequence ha-icon {
  --mdc-icon-size: 16px;
  color: var(--secondary-text-color);
  flex: 0 0 auto;
}

.event-time-sequence .preconditioning-icon {
  color: var(--primary-color);
}

.event-time-sequence .preconditioning-arrow {
  color: var(--primary-text-color);
}

.event-time-sequence .target-time {
  color: var(--secondary-text-color);
  font-weight: 400;
}

.event-time-sequence .preconditioning-start {
  color: var(--primary-text-color);
  font-weight: 700;
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

.event-time-flow.next-event-updated {
  border-radius: 3px;
}

.event-time-flow.next-event-updated.update-odd {
  animation: velair-next-event-updated-odd 2.2s ease-out;
}

.event-time-flow.next-event-updated.update-even {
  animation: velair-next-event-updated-even 2.2s ease-out;
}

@keyframes velair-next-event-updated-odd {
  0% {
    background: color-mix(in srgb, var(--primary-color) 18%, transparent);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary-color) 18%, transparent);
  }
  100% {
    background: transparent;
    box-shadow: 0 0 0 4px transparent;
  }
}

@keyframes velair-next-event-updated-even {
  0% {
    background: color-mix(in srgb, var(--primary-color) 18%, transparent);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary-color) 18%, transparent);
  }
  100% {
    background: transparent;
    box-shadow: 0 0 0 4px transparent;
  }
}

@media (prefers-reduced-motion: reduce) {
  .event-time-flow.next-event-updated.update-odd,
  .event-time-flow.next-event-updated.update-even {
    animation: none;
    background: color-mix(in srgb, var(--primary-color) 12%, transparent);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary-color) 18%, transparent);
  }
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
`, mn = u`
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
    align-items: start;
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
`, hn = u`
.preconditioning-view {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.preconditioning-intro {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: 24px minmax(0, 1fr);
  padding: 2px 4px 4px;
}

.preconditioning-intro > ha-icon {
  --mdc-icon-size: 22px;
  color: var(--primary-color);
}

.preconditioning-intro > span {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.preconditioning-intro strong {
  color: var(--primary-text-color);
  font-size: 14px;
  line-height: 1.25;
}

.preconditioning-intro small {
  color: var(--secondary-text-color);
  font-size: 12px;
  line-height: 1.35;
}

.preconditioning-zone {
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  display: grid;
  min-width: 0;
  overflow: visible;
  position: relative;
}

.preconditioning-zone-heading {
  align-items: center;
  background: var(--card-background-color);
  border-bottom: 1px solid var(--divider-color);
  cursor: pointer;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) auto;
  min-width: 0;
  padding: 12px;
  border-radius: 8px 8px 0 0;
}

.preconditioning-zone.collapsed .preconditioning-zone-heading {
  border-bottom: 0;
  border-radius: 8px;
}

.preconditioning-zone-toggle {
  align-items: center;
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  display: grid;
  gap: 8px;
  grid-template-columns: 20px minmax(0, 1fr);
  min-width: 0;
  padding: 0;
  text-align: left;
}

.preconditioning-zone-toggle:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 4px;
}

.preconditioning-zone-toggle:disabled {
  cursor: default;
}

.preconditioning-zone-toggle:disabled .preconditioning-expand-icon {
  opacity: 0.45;
}

.preconditioning-zone-toggle > ha-icon {
  --mdc-icon-size: 20px;
}

.preconditioning-expand-icon {
  color: var(--secondary-text-color);
}

.preconditioning-zone-actions,
.preconditioning-enable-control {
  align-items: center;
  display: flex;
  gap: 8px;
  min-width: 0;
}

.preconditioning-settings-reset {
  height: 32px;
  width: 32px;
}

.preconditioning-settings-reset ha-icon {
  --mdc-icon-size: 18px;
}

.preconditioning-unavailable-message {
  color: var(--secondary-text-color);
  display: none;
  font-size: 12px;
  line-height: 1.3;
}

.preconditioning-zone-identity {
  display: grid;
  gap: 2px;
  min-width: 0;
  text-align: left;
}

.preconditioning-zone-identity strong,
.preconditioning-zone-identity span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preconditioning-zone-identity strong {
  color: var(--primary-text-color);
  font-size: 14px;
}

.preconditioning-zone-identity span {
  color: var(--secondary-text-color);
  font-size: 12px;
}

.preconditioning-zone-content {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 12px;
}

.preconditioning-config-sections {
  display: grid;
  gap: 16px 24px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-width: 0;
}

.preconditioning-config-section {
  align-content: start;
  border: 1px solid var(--divider-color);
  border-radius: 6px;
  display: grid;
  gap: 0;
  grid-template-rows: max-content max-content;
  min-width: 0;
  position: relative;
}

.preconditioning-config-section:focus-within,
.preconditioning-config-section:hover {
  z-index: 3;
}

.preconditioning-config-section h3,
.preconditioning-learning-heading {
  align-items: center;
  border-bottom: 1px solid var(--divider-color);
  color: var(--primary-text-color);
  display: flex;
  font-size: 13px;
  font-weight: 700;
  gap: 6px;
  margin: 0;
  padding: 0 0 7px;
}

.preconditioning-config-section h3 {
  background: var(--secondary-background-color);
  border-radius: 5px 5px 0 0;
  padding: 8px 10px;
}

.preconditioning-config-section h3 ha-icon,
.preconditioning-learning-heading ha-icon {
  --mdc-icon-size: 17px;
  color: var(--primary-color);
}

.preconditioning-config-rows {
  align-content: start;
  display: grid;
  min-width: 0;
  padding: 0 10px 4px;
}

.preconditioning-config-row {
  align-items: center;
  border-top: 1px solid color-mix(in srgb, var(--divider-color) 65%, transparent);
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) minmax(96px, 120px);
  min-height: 42px;
  min-width: 0;
  padding: 6px 0;
  position: relative;
}

.preconditioning-config-row:first-child {
  border-top: 0;
}

.preconditioning-config-row > .label {
  color: var(--secondary-text-color);
  font-size: 12px;
  line-height: 1.3;
  min-width: 0;
  overflow-wrap: anywhere;
}

.preconditioning-config-label {
  align-items: center;
  display: flex;
  gap: 4px;
}

.preconditioning-help {
  align-items: center;
  color: var(--secondary-text-color);
  cursor: help;
  display: inline-flex;
  flex: 0 0 auto;
  outline: none;
  position: relative;
}

.preconditioning-help ha-icon {
  --mdc-icon-size: 15px;
}

.preconditioning-help-tooltip {
  background: var(--primary-text-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.22);
  color: var(--primary-background-color);
  font-size: 11px;
  font-weight: 400;
  left: 50%;
  line-height: 1.35;
  max-width: min(240px, calc(100vw - 40px));
  opacity: 0;
  padding: 7px 8px;
  pointer-events: none;
  position: absolute;
  top: calc(100% + 6px);
  transform: translateX(-22px);
  transition: opacity 120ms ease, visibility 120ms ease;
  visibility: hidden;
  white-space: normal;
  width: max-content;
  z-index: 20;
}

.preconditioning-help:hover .preconditioning-help-tooltip,
.preconditioning-help:focus .preconditioning-help-tooltip,
.preconditioning-help:focus-visible .preconditioning-help-tooltip {
  opacity: 1;
  visibility: visible;
}

.preconditioning-config-row input,
.preconditioning-config-row select {
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 6px;
  box-sizing: border-box;
  color: var(--primary-text-color);
  min-width: 0;
  padding: 7px 8px;
  width: 100%;
}

.preconditioning-sensor-row {
  grid-template-columns: minmax(0, 1fr) minmax(150px, 1.4fr);
}

.preconditioning-sensor-row.inactive select {
  background: color-mix(in srgb, var(--disabled-text-color) 10%, var(--card-background-color));
  border-style: dashed;
  color: var(--secondary-text-color);
}

.preconditioning-config-row.inactive input {
  background: color-mix(in srgb, var(--disabled-text-color) 10%, var(--card-background-color));
  border-style: dashed;
  color: var(--secondary-text-color);
}

.preconditioning-config-row.inactive ha-switch {
  opacity: 0.6;
}

.preconditioning-toggle-row ha-switch {
  justify-self: end;
}

.preconditioning-learning {
  border-top: 1px dashed var(--divider-color);
  display: grid;
  gap: 8px;
  min-width: 0;
  padding-top: 12px;
}

.preconditioning-learning-heading {
  margin-bottom: 8px;
}

.preconditioning-directions {
  align-items: start;
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-width: 0;
}

.preconditioning-direction {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.preconditioning-direction.heat {
  --preconditioning-accent: #d95f24;
}

.preconditioning-direction.cool {
  --preconditioning-accent: #2d7dd2;
}

.preconditioning-direction-heading {
  align-items: center;
  background: color-mix(in srgb, var(--preconditioning-accent, var(--primary-color)) 8%, var(--card-background-color));
  border: 1px solid color-mix(in srgb, var(--preconditioning-accent, var(--primary-color)) 22%, var(--divider-color));
  border-radius: 5px;
  color: var(--primary-text-color);
  display: flex;
  font-size: 13px;
  font-weight: 700;
  justify-content: space-between;
  min-width: 0;
  padding: 6px 7px;
}

.preconditioning-direction-heading span {
  align-items: center;
  display: inline-flex;
  gap: 5px;
  min-width: 0;
}

.preconditioning-direction-heading ha-icon {
  --mdc-icon-size: 16px;
  color: var(--preconditioning-accent, var(--primary-color));
}

.preconditioning-prediction {
  background:
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--preconditioning-accent, var(--primary-color)) 10%, transparent),
      transparent 40%
    ),
    var(--secondary-background-color);
  border: 1px solid color-mix(in srgb, var(--preconditioning-accent, var(--primary-color)) 18%, var(--divider-color));
  border-left: 3px solid var(--preconditioning-accent, var(--primary-color));
  border-radius: 6px;
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 8px;
}

.preconditioning-prediction.heat {
  --preconditioning-accent: #d95f24;
}

.preconditioning-prediction.cool {
  --preconditioning-accent: #2d7dd2;
}

.preconditioning-prediction-heading {
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: space-between;
  min-width: 0;
}

.preconditioning-prediction-heading > span:first-child {
  color: var(--primary-text-color);
  font-size: 12px;
  font-weight: 600;
}

.preconditioning-live-label {
  align-items: center;
  background: color-mix(in srgb, var(--preconditioning-accent, var(--primary-color)) 10%, var(--card-background-color));
  border: 1px solid color-mix(in srgb, var(--preconditioning-accent, var(--primary-color)) 20%, var(--divider-color));
  border-radius: 999px;
  color: var(--secondary-text-color);
  display: inline-flex;
  font-size: 12px;
  font-weight: 600;
  gap: 5px;
  min-width: 0;
  padding: 3px 8px;
  white-space: nowrap;
}

.preconditioning-live-label > span:first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preconditioning-live-label .preconditioning-help {
  color: var(--secondary-text-color);
}

.preconditioning-block-preview {
  align-items: stretch;
  display: grid;
  grid-template-columns: minmax(96px, 0.72fr) minmax(150px, 1.28fr);
  min-width: 0;
}

.preconditioning-block-preview.normal-start {
  grid-template-columns: minmax(0, 1fr);
}

.preconditioning-prestart {
  align-content: center;
  background:
    repeating-linear-gradient(
      135deg,
      color-mix(in srgb, var(--preconditioning-accent, var(--primary-color)) 5%, transparent) 0 8px,
      transparent 8px 16px
    ),
    color-mix(in srgb, var(--preconditioning-accent, var(--primary-color)) 4%, var(--card-background-color));
  border: 1px dashed color-mix(in srgb, var(--preconditioning-accent, var(--primary-color)) 42%, var(--divider-color));
  border-radius: 8px 0 0 8px;
  border-right: 0;
  box-sizing: border-box;
  display: grid;
  gap: 2px;
  min-width: 0;
  padding: 8px 10px;
  position: relative;
}

.preconditioning-prestart::after {
  border-bottom: 8px solid transparent;
  border-left: 9px solid color-mix(in srgb, var(--preconditioning-accent, var(--primary-color)) 48%, var(--divider-color));
  border-top: 8px solid transparent;
  content: "";
  position: absolute;
  right: -9px;
  top: calc(50% - 8px);
  z-index: 1;
}

.preconditioning-prestart small,
.preconditioning-preview-block small {
  color: color-mix(in srgb, var(--primary-text-color) 72%, var(--secondary-text-color));
  font-size: 10px;
  line-height: 1.2;
}

.preconditioning-prestart strong,
.preconditioning-prestart span,
.preconditioning-preview-block strong,
.preconditioning-preview-block span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preconditioning-prestart strong,
.preconditioning-preview-block strong {
  color: var(--primary-text-color);
  font-size: 12px;
  font-weight: 700;
}

.preconditioning-prestart span {
  color: color-mix(in srgb, var(--primary-text-color) 80%, var(--secondary-text-color));
  font-size: 11px;
  font-weight: 500;
}

.preconditioning-preview-block {
  align-content: center;
  background: var(--timeline-bg, color-mix(in srgb, var(--primary-color) 18%, var(--card-background-color)));
  border: 1px solid var(--timeline-border, color-mix(in srgb, var(--primary-color) 42%, var(--divider-color)));
  border-radius: 8px;
  box-sizing: border-box;
  display: grid;
  gap: 1px;
  min-width: 0;
  padding: 9px 12px;
  position: relative;
}

.preconditioning-block-preview.with-prestart .preconditioning-preview-block {
  border-radius: 0 8px 8px 0;
}

.preconditioning-preview-block.mode-heat {
  --timeline-bg: color-mix(in srgb, #d95f24 18%, var(--card-background-color));
  --timeline-border: color-mix(in srgb, #d95f24 48%, var(--divider-color));
}

.preconditioning-preview-block.mode-cool {
  --timeline-bg: color-mix(in srgb, #2d7dd2 18%, var(--card-background-color));
  --timeline-border: color-mix(in srgb, #2d7dd2 48%, var(--divider-color));
}

.preconditioning-preview-block span {
  color: var(--primary-text-color);
  font-size: 11px;
}

.preconditioning-calculation-details {
  background: color-mix(in srgb, var(--card-background-color) 78%, transparent);
  border: 1px solid color-mix(in srgb, var(--preconditioning-accent, var(--primary-color)) 14%, var(--divider-color));
  border-radius: 6px;
  color: var(--secondary-text-color);
  min-width: 0;
}

.preconditioning-calculation-details summary {
  align-items: center;
  cursor: pointer;
  display: flex;
  font-size: 12px;
  font-weight: 600;
  gap: 6px;
  min-width: 0;
  padding: 7px 8px;
}

.preconditioning-calculation-details summary::marker {
  color: var(--secondary-text-color);
}

.preconditioning-calculation-details summary ha-icon {
  --mdc-icon-size: 15px;
  color: var(--preconditioning-accent, var(--primary-color));
}

.preconditioning-calculation-grid {
  border-top: 1px solid var(--divider-color);
  display: grid;
  gap: 6px;
  padding: 8px;
}

.preconditioning-calculation-row {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.preconditioning-calculation-row.context {
  grid-template-columns: minmax(148px, 1.6fr) minmax(64px, 0.55fr) minmax(82px, 0.65fr);
}

.preconditioning-calculation-row.estimates {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.preconditioning-calculation-row.result.with-rounded {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.preconditioning-calculation-row.result.without-rounded {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.preconditioning-calculation-item {
  background: var(--secondary-background-color);
  border: 1px solid color-mix(in srgb, var(--divider-color) 72%, transparent);
  border-radius: 5px;
  display: grid;
  gap: 2px;
  min-width: 0;
  padding: 6px 7px;
}

.preconditioning-calculation-label-text,
.preconditioning-calculation-item strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preconditioning-calculation-label {
  color: var(--secondary-text-color);
  cursor: help;
  display: block;
  font-size: 10px;
  line-height: 1.2;
  min-width: 0;
  outline: none;
  position: relative;
}

.preconditioning-calculation-label:focus-visible .preconditioning-calculation-label-text {
  outline: 1px solid var(--primary-color);
  outline-offset: 2px;
}

.preconditioning-calculation-label-text {
  display: block;
}

.preconditioning-calculation-tooltip {
  background: var(--primary-text-color);
  border-radius: 4px;
  bottom: calc(100% + 6px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.22);
  color: var(--card-background-color);
  font-size: 11px;
  left: 0;
  line-height: 1.25;
  max-width: min(240px, 78vw);
  opacity: 0;
  padding: 5px 7px;
  pointer-events: none;
  position: absolute;
  transform: translateY(2px);
  transition: opacity 120ms ease, transform 120ms ease;
  visibility: hidden;
  white-space: normal;
  width: max-content;
  z-index: 12;
}

.preconditioning-calculation-row.context .preconditioning-calculation-item:last-child .preconditioning-calculation-tooltip,
.preconditioning-calculation-row.result .preconditioning-calculation-item:last-child .preconditioning-calculation-tooltip {
  left: auto;
  right: 0;
}

.preconditioning-calculation-label:hover .preconditioning-calculation-tooltip,
.preconditioning-calculation-label:focus .preconditioning-calculation-tooltip,
.preconditioning-calculation-label:focus-visible .preconditioning-calculation-tooltip {
  opacity: 1;
  transform: translateY(0);
  visibility: visible;
}

.preconditioning-calculation-item strong {
  color: var(--primary-text-color);
  font-size: 12px;
  font-weight: 650;
}

.preconditioning-calculation-item.samples strong {
  line-height: 1.25;
  white-space: normal;
}

.preconditioning-calculation-item.compact {
  text-align: center;
}

.preconditioning-calculation-item.final {
  border-color: color-mix(in srgb, var(--preconditioning-accent, var(--primary-color)) 26%, var(--divider-color));
}

.preconditioning-prediction-empty {
  align-items: center;
  color: var(--secondary-text-color);
  display: grid;
  font-size: 12px;
  gap: 8px;
  grid-template-columns: 20px minmax(0, 1fr);
  min-width: 0;
}

.preconditioning-prediction-empty ha-icon {
  --mdc-icon-size: 18px;
}

.preconditioning-learning-reset {
  height: 28px;
  width: 28px;
}

.preconditioning-learning-reset ha-icon {
  --mdc-icon-size: 16px;
  color: var(--primary-color);
}

.preconditioning-learning-status-card {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.preconditioning-learning-summary {
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-width: 0;
}

.preconditioning-learning-indicator {
  align-items: center;
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 6px;
  display: grid;
  gap: 7px;
  grid-template-columns: 20px minmax(0, 1fr);
  min-width: 0;
  padding: 7px;
}

.preconditioning-learning-indicator ha-icon {
  --mdc-icon-size: 19px;
  color: var(--secondary-text-color);
}

.preconditioning-learning-indicator.ready ha-icon,
.preconditioning-learning-indicator.history ha-icon {
  color: var(--success-color, #2e7d32);
}

.preconditioning-learning-indicator.learning ha-icon {
  color: var(--preconditioning-accent, var(--primary-color));
}

.preconditioning-learning-indicator > span {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.preconditioning-learning-indicator small,
.preconditioning-learning-indicator strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preconditioning-learning-indicator small {
  color: var(--secondary-text-color);
  font-size: 10px;
}

.preconditioning-learning-indicator strong {
  color: var(--primary-text-color);
  font-size: 12px;
  font-weight: 600;
}

.preconditioning-sample-chips {
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  min-width: 0;
}

.preconditioning-sample-card {
  background: color-mix(in srgb, var(--preconditioning-accent, var(--primary-color)) 3%, var(--secondary-background-color));
  border: 1px solid color-mix(in srgb, var(--preconditioning-accent, var(--primary-color)) 12%, var(--divider-color));
  border-radius: 6px;
  min-width: 0;
  padding: 6px;
}

.preconditioning-sample-chip {
  align-items: center;
  background: color-mix(in srgb, var(--sample-chip-color, var(--primary-color)) 8%, var(--card-background-color));
  border: 1px solid color-mix(in srgb, var(--sample-chip-color, var(--primary-color)) 20%, var(--divider-color));
  border-radius: 999px;
  color: var(--secondary-text-color);
  display: inline-flex;
  font-size: 11px;
  gap: 5px;
  justify-content: center;
  line-height: 1.2;
  min-height: 22px;
  min-width: 0;
  padding: 2px 7px;
  white-space: nowrap;
}

.preconditioning-sample-chip.complete {
  --sample-chip-color: var(--success-color, #2e7d32);
}

.preconditioning-sample-chip.partial {
  --sample-chip-color: #b06a00;
}

.preconditioning-sample-chip.invalid {
  --sample-chip-color: var(--error-color, #ba1a1a);
}

.preconditioning-sample-chip span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preconditioning-sample-chip strong {
  color: var(--primary-text-color);
  font-size: 11px;
}

`, gn = u`
.sensors-view {
  display: grid;
  gap: 12px;
}

.sensors-intro {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: 24px minmax(0, 1fr);
  padding: 2px 4px 4px;
}

.sensors-intro > ha-icon {
  --mdc-icon-size: 22px;
  color: var(--primary-color);
}

.sensors-intro > span {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.sensors-intro strong {
  color: var(--primary-text-color);
  font-size: 14px;
  line-height: 1.25;
}

.sensors-intro small {
  color: var(--secondary-text-color);
  font-size: 12px;
  line-height: 1.35;
}

.sensor-zone {
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  display: grid;
  min-width: 0;
  overflow: visible;
  position: relative;
}

.sensor-zone-heading {
  align-items: center;
  background: var(--card-background-color);
  border-bottom: 1px solid var(--divider-color);
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) auto;
  min-width: 0;
  padding: 12px;
}

.sensor-zone.collapsed .sensor-zone-heading {
  border-bottom: 0;
  border-radius: 8px;
}

.sensor-zone-toggle {
  align-items: center;
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  display: grid;
  gap: 8px;
  grid-template-columns: 20px minmax(0, 1fr);
  min-width: 0;
  padding: 0;
  text-align: left;
}

.sensor-zone-toggle:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 4px;
}

.sensor-zone-toggle:disabled {
  cursor: default;
}

.sensor-zone-toggle:disabled .sensor-expand-icon {
  color: var(--disabled-text-color);
  opacity: 0.45;
}

.sensor-zone-toggle > ha-icon {
  --mdc-icon-size: 20px;
  color: var(--secondary-text-color);
}

.sensor-zone-identity {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.sensor-zone-identity strong,
.sensor-zone-identity span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sensor-zone-identity strong {
  color: var(--primary-text-color);
  font-size: 14px;
}

.sensor-zone-identity span {
  color: var(--secondary-text-color);
  font-size: 12px;
}

.sensor-zone-actions {
  align-items: center;
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
  justify-content: flex-end;
}

.sensor-enable-control.unavailable {
  cursor: help;
  opacity: 0.55;
}

.sensor-zone-content {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 12px;
}

.sensor-config-section,
.sensor-runtime-section {
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  overflow: visible;
  position: relative;
}

.sensor-config-section:focus-within,
.sensor-config-section:hover,
.sensor-runtime-section:focus-within,
.sensor-runtime-section:hover {
  z-index: 3;
}

.sensor-config-section h3,
.sensor-runtime-section h3 {
  align-items: center;
  background: color-mix(in srgb, var(--primary-text-color) 6%, transparent);
  border-bottom: 1px solid var(--divider-color);
  color: var(--primary-text-color);
  display: flex;
  font-size: 13px;
  font-weight: 700;
  gap: 8px;
  justify-content: space-between;
  letter-spacing: 0;
  margin: 0;
  padding: 10px 12px;
}

.sensor-section-title {
  align-items: center;
  display: inline-flex;
  gap: 8px;
  min-width: 0;
}

.sensor-config-section h3 ha-icon,
.sensor-runtime-section h3 ha-icon {
  color: var(--primary-color);
  height: 18px;
  width: 18px;
}

.sensor-config-rows {
  display: grid;
}

.sensor-config-row {
  align-items: center;
  border-top: 1px solid var(--divider-color);
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 260px);
  padding: 12px;
}

.sensor-config-row:first-child {
  border-top: 0;
}

.sensor-config-row.inactive {
  opacity: 0.62;
}

.sensor-number-input {
  align-items: center;
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.sensor-number-input > span {
  color: var(--secondary-text-color);
  font-size: 12px;
  white-space: nowrap;
}

.sensor-config-label {
  align-items: center;
  color: var(--primary-text-color);
  display: inline-flex;
  gap: 6px;
  min-width: 0;
}

.sensor-help {
  align-items: center;
  color: var(--secondary-text-color);
  cursor: help;
  display: inline-flex;
  flex: 0 0 auto;
  outline: none;
  position: relative;
}

.sensor-help ha-icon {
  --mdc-icon-size: 15px;
}

.sensor-help-tooltip {
  background: var(--primary-text-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.22);
  color: var(--primary-background-color);
  font-size: 11px;
  font-weight: 400;
  left: 50%;
  line-height: 1.35;
  max-width: min(240px, calc(100vw - 40px));
  opacity: 0;
  padding: 7px 8px;
  pointer-events: none;
  position: absolute;
  top: calc(100% + 6px);
  transform: translateX(-22px);
  transition: opacity 120ms ease, visibility 120ms ease;
  visibility: hidden;
  white-space: normal;
  width: max-content;
  z-index: 20;
}

.sensor-help:hover .sensor-help-tooltip,
.sensor-help:focus .sensor-help-tooltip,
.sensor-help:focus-visible .sensor-help-tooltip {
  opacity: 1;
  visibility: visible;
}

.sensor-status-card {
  display: grid;
  gap: 12px;
  padding: 12px;
}

.sensor-inactive-section p {
  color: var(--secondary-text-color);
  font-size: 13px;
  line-height: 1.4;
  margin: 0;
  padding: 12px;
}

.sensor-inactive-section h3 ha-icon {
  align-items: center;
  display: inline-flex;
  justify-content: center;
  line-height: 1;
}

.sensor-block-summary {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.sensor-block-detail {
  align-items: center;
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 7px;
  color: var(--secondary-text-color);
  display: grid;
  font-size: 12px;
  gap: 7px;
  grid-template-columns: 18px minmax(0, 1fr);
  line-height: 1.3;
  min-width: 0;
  padding: 8px 9px;
}

.sensor-block-detail ha-icon {
  --mdc-icon-size: 17px;
  color: var(--secondary-text-color);
}

.sensor-block-detail.emphasis {
  border-color: color-mix(in srgb, var(--primary-color) 35%, var(--divider-color));
  color: var(--primary-text-color);
}

.sensor-block-detail.emphasis ha-icon {
  color: var(--primary-color);
}

.sensor-status-pill {
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 999px;
  color: var(--primary-text-color);
  display: inline-flex;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  padding: 5px 9px;
  white-space: nowrap;
}

.sensor-status-pill.assisting,
.sensor-status-pill.ready {
  background: color-mix(in srgb, var(--primary-color) 12%, transparent);
  border-color: color-mix(in srgb, var(--primary-color) 36%, var(--divider-color));
}

.sensor-status-pill.holding {
  background: color-mix(in srgb, var(--success-color, #43a047) 12%, transparent);
  border-color: color-mix(in srgb, var(--success-color, #43a047) 36%, var(--divider-color));
}

.sensor-status-pill.blocked,
.sensor-status-pill.unavailable {
  background: color-mix(in srgb, var(--warning-color, #f9a825) 14%, transparent);
  border-color: color-mix(in srgb, var(--warning-color, #f9a825) 38%, var(--divider-color));
}

.sensor-temperature-scale {
  --sensor-scale-line-end: #2d7dd2;
  --sensor-scale-line-start: color-mix(in srgb, var(--secondary-text-color) 22%, transparent);
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  display: grid;
  gap: 6px;
  min-width: 0;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  padding: 12px 12px 10px;
}

.sensor-temperature-scale.mode-heat {
  --sensor-scale-line-end: #d95f24;
}

.sensor-temperature-scale.mode-heat-cool {
  --sensor-scale-line-end: #2d7dd2;
  --sensor-scale-line-start: color-mix(in srgb, #d95f24 62%, transparent);
}

.sensor-scale-track {
  min-height: 136px;
  min-width: 640px;
  position: relative;
}

.sensor-scale-line {
  background: linear-gradient(
    90deg,
    var(--sensor-scale-line-start),
    color-mix(in srgb, var(--sensor-scale-line-end) 38%, transparent)
  );
  border-radius: 999px;
  display: block;
  height: 6px;
  left: 0;
  position: absolute;
  right: 0;
  top: 66px;
}

.sensor-scale-relation {
  display: block;
  height: 0;
  min-width: 18px;
  position: absolute;
}

.sensor-scale-room-gap {
  border-top: 2px solid color-mix(in srgb, var(--secondary-text-color) 46%, transparent);
  top: 83px;
}

.sensor-scale-assist-offset {
  top: 108px;
}

.sensor-scale-assist-offset.assist-offset-active {
  border-top: 3px dashed color-mix(in srgb, var(--success-color, #43a047) 74%, transparent);
}

.sensor-scale-assist-offset.assist-offset-holding {
  border-top: 2px dotted color-mix(in srgb, var(--secondary-text-color) 62%, transparent);
}

.sensor-scale-assist-offset.assist-offset-unknown {
  border-top: 2px dashed color-mix(in srgb, var(--secondary-text-color) 42%, transparent);
}

.sensor-scale-relation span {
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 999px;
  color: var(--primary-text-color);
  font-size: 10px;
  font-weight: 700;
  left: 50%;
  line-height: 1;
  padding: 3px 6px;
  position: absolute;
  top: 6px;
  transform: translateX(-50%);
  white-space: nowrap;
}

.sensor-scale-room-gap span {
  color: var(--secondary-text-color);
}

.sensor-scale-assist-offset.assist-offset-active span {
  border-color: color-mix(in srgb, var(--success-color, #43a047) 38%, var(--divider-color));
  color: var(--success-color, #43a047);
}

.sensor-scale-assist-offset.assist-offset-holding span,
.sensor-scale-assist-offset.assist-offset-unknown span {
  color: var(--secondary-text-color);
}

.sensor-scale-marker {
  display: block;
  height: 0;
  position: absolute;
  top: 69px;
  transform: translateX(-50%);
  width: 0;
  z-index: 1;
}

.sensor-scale-callout-marker {
  --callout-left: 50%;
  display: block;
  height: 0;
  left: clamp(72px, var(--callout-left), calc(100% - 72px));
  position: absolute;
  top: 69px;
  width: 0;
  z-index: 2;
}

.sensor-scale-callout {
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-left: 3px solid var(--secondary-text-color);
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  bottom: 18px;
  display: grid;
  gap: 1px;
  left: 0;
  max-width: 144px;
  min-width: 96px;
  padding: 5px 7px 5px 6px;
  pointer-events: auto;
  position: absolute;
  text-align: left;
  transform: translateX(-50%);
}

.sensor-scale-callout::after {
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid var(--card-background-color);
  bottom: -6px;
  content: "";
  height: 0;
  left: 50%;
  position: absolute;
  transform: translateX(-50%);
  width: 0;
}

.sensor-scale-callout-marker.shifted .sensor-scale-callout::after {
  display: none;
}

.sensor-scale-callout small,
.sensor-scale-callout strong,
.sensor-scale-bounds span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sensor-scale-callout small {
  color: var(--secondary-text-color);
  font-size: 10px;
  line-height: 1.15;
}

.sensor-scale-callout strong {
  color: var(--primary-text-color);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.15;
}

.sensor-scale-value-row {
  align-items: center;
  display: inline-flex;
  gap: 5px;
  min-width: 0;
  overflow: visible;
  white-space: nowrap;
}

.sensor-scale-offset {
  align-items: center;
  color: var(--primary-color);
  display: inline-flex;
  font-size: 10px;
  font-weight: 700;
  gap: 3px;
  line-height: 1.1;
  min-width: 0;
  overflow: visible;
  white-space: nowrap;
}

.sensor-scale-offset-help {
  align-items: center;
  color: var(--secondary-text-color);
  cursor: help;
  display: inline-flex;
  flex: 0 0 auto;
  outline: none;
  overflow: visible;
  position: relative;
}

.sensor-scale-offset-help ha-icon {
  --mdc-icon-size: 12px;
}

.sensor-scale-offset-tooltip {
  background: var(--primary-text-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.22);
  color: var(--primary-background-color);
  font-size: 11px;
  font-weight: 400;
  left: 50%;
  line-height: 1.35;
  max-width: min(220px, calc(100vw - 40px));
  opacity: 0;
  padding: 7px 8px;
  pointer-events: none;
  position: absolute;
  top: calc(100% + 6px);
  transform: translateX(-50%);
  transition: opacity 120ms ease, visibility 120ms ease;
  visibility: hidden;
  white-space: normal;
  width: max-content;
  z-index: 30;
}

.sensor-scale-callout-marker.edge-left .sensor-scale-offset-tooltip {
  left: 0;
  transform: none;
}

.sensor-scale-callout-marker.edge-right .sensor-scale-offset-tooltip {
  left: auto;
  right: 0;
  transform: none;
}

.sensor-scale-offset-help:hover .sensor-scale-offset-tooltip,
.sensor-scale-offset-help:focus .sensor-scale-offset-tooltip,
.sensor-scale-offset-help:focus-visible .sensor-scale-offset-tooltip {
  opacity: 1;
  visibility: visible;
}

.sensor-scale-dot {
  background: var(--card-background-color);
  border: 3px solid var(--secondary-text-color);
  border-radius: 50%;
  box-shadow: 0 0 0 2px var(--card-background-color);
  height: 12px;
  left: 0;
  position: absolute;
  top: 0;
  transform: translate(-50%, -50%);
  width: 12px;
}

.sensor-scale-marker.marker-target .sensor-scale-dot {
  background: var(--error-color, #d93025);
  border-color: var(--error-color, #d93025);
  height: 14px;
  width: 14px;
}

.sensor-scale-callout-marker.marker-target .sensor-scale-callout {
  border-left-color: var(--error-color, #d93025);
}

.sensor-scale-marker.marker-room .sensor-scale-dot {
  border-color: var(--success-color, #43a047);
}

.sensor-scale-callout-marker.marker-room .sensor-scale-callout {
  border-left-color: var(--success-color, #43a047);
}

.sensor-scale-marker.marker-climateTarget .sensor-scale-dot {
  border-color: var(--primary-color);
}

.sensor-scale-callout-marker.marker-climateTarget .sensor-scale-callout {
  border-left-color: var(--primary-color);
}

.sensor-scale-marker.marker-climate .sensor-scale-dot {
  border-color: var(--secondary-text-color);
}

.sensor-scale-marker .sensor-scale-dot.segmented {
  background: var(--sensor-scale-dot-segments, var(--secondary-text-color));
  border: 0;
  height: 16px;
  width: 16px;
}

.sensor-scale-marker .sensor-scale-dot.segmented::after {
  background: var(--card-background-color);
  border-radius: 50%;
  content: "";
  inset: 4px;
  position: absolute;
}

.sensor-scale-callout-marker.marker-climate .sensor-scale-callout {
  border-left-color: var(--secondary-text-color);
}

.sensor-scale-bounds {
  color: var(--secondary-text-color);
  font-size: 11px;
}

.sensor-scale-bounds {
  display: flex;
  justify-content: space-between;
  min-width: 640px;
}

.sensor-idle-state {
  align-items: center;
  background: var(--secondary-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  color: var(--secondary-text-color);
  display: grid;
  font-size: 13px;
  gap: 8px;
  grid-template-columns: 20px minmax(0, 1fr);
  line-height: 1.35;
  padding: 12px;
}

.sensor-idle-state ha-icon {
  --mdc-icon-size: 19px;
  color: var(--secondary-text-color);
}

.sensor-selected-entity {
  color: var(--secondary-text-color);
  display: block;
  font-size: 11px;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 720px) {
  .sensor-zone-heading {
    align-items: center;
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .sensor-zone-actions {
    justify-content: flex-end;
  }

  .sensor-config-row {
    align-items: stretch;
    grid-template-columns: minmax(0, 1fr);
  }

  .sensor-block-summary {
    grid-template-columns: minmax(0, 1fr);
  }

}
`, _n = u`
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
.settings-startup,
.settings-temperature {
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

.settings-temperature {
  align-items: start;
  display: grid;
  gap: 12px;
  grid-template-columns: 36px minmax(0, 1fr) auto;
}

.settings-temperature.migration-required {
  border-color: var(--warning-color, #c99500);
}

.settings-temperature-copy {
  min-width: 0;
}

.settings-temperature-copy > p,
.temperature-migration-action p {
  color: var(--secondary-text-color);
  font-size: 12px;
  margin: 4px 0 0;
}

.settings-temperature-value {
  align-self: center;
  background: var(--card-background-color);
  border: 1px solid var(--divider-color);
  border-radius: 999px;
  font-size: 16px;
  padding: 7px 12px;
}

.temperature-migration-action {
  border-top: 1px solid var(--divider-color);
  margin-top: 12px;
  padding-top: 12px;
}

.temperature-migration-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.temperature-migration-buttons .command-button {
  width: auto;
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
  display: grid;
  gap: 8px;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  min-width: 0;
  padding: 10px;
}

.settings-drag-handle {
  align-items: center;
  background: transparent;
  border: 0;
  color: var(--secondary-text-color);
  cursor: grab;
  display: inline-flex;
  height: 28px;
  justify-content: center;
  margin: -2px;
  padding: 0;
  width: 28px;
}

.settings-drag-handle:active {
  cursor: grabbing;
}

.settings-drag-handle ha-icon {
  --mdc-icon-size: 18px;
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

.settings-zone-identity .settings-feature-badge {
  align-items: center;
  background: color-mix(in srgb, var(--primary-color) 12%, var(--card-background-color));
  border: 1px solid color-mix(in srgb, var(--primary-color) 34%, var(--divider-color));
  border-radius: 999px;
  color: var(--primary-text-color);
  display: inline-flex;
  font-size: 11px;
  gap: 4px;
  justify-self: start;
  line-height: 1;
  margin-top: 4px;
  max-width: 100%;
  padding: 4px 7px;
  white-space: nowrap;
}

.settings-feature-badge ha-icon {
  --mdc-icon-size: 14px;
  color: var(--primary-color);
  flex: 0 0 auto;
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

.settings-facts .capability-not-reported {
  color: var(--secondary-text-color);
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
`, vn = u`
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

.template-placeholder.compact {
  align-items: center;
  background: var(--secondary-background-color);
  border: 1px dashed var(--divider-color);
  border-radius: 8px;
  color: var(--secondary-text-color);
  display: grid;
  font-size: 14px;
  font-weight: 600;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  line-height: 1.35;
  min-height: 64px;
  min-width: 0;
  padding: 12px 56px;
  position: relative;
  text-align: center;
}

.template-placeholder.compact span {
  min-width: 0;
}

.template-placeholder.compact > .icon-button {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
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
`, yn = u`
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
`, bn = u`
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
    .overview-timeline-empty {
      bottom: auto;
      height: 100%;
      left: calc(var(--overview-timeline-name-column) + 10px);
      position: sticky;
      top: 0;
    }

    .overview-timeline-block,
    .overview-timeline-boost,
    .overview-timeline-pause {
      overflow: visible;
    }

    .overview-timeline-block-main {
      left: calc(var(--overview-timeline-name-column) + 12px);
      max-width: min(150px, calc(100vw - var(--overview-timeline-name-column) - 32px));
      position: sticky;
    }

    .next .event {
      grid-template-columns: minmax(110px, 150px) max-content;
      min-width: max-content;
    }

    .next .event-details,
    .next .event-details.preconditioned {
      grid-template-columns: 18ch 8ch 12ch;
    }

    .next .event-list.has-preconditioning .event-details,
    .next .event-list.has-preconditioning .event-details.preconditioned {
      grid-template-columns: 40ch 8ch 12ch;
    }

    .next .event-time {
      justify-content: flex-start;
    }

    .next .event-list.has-preconditioning .event-time-flow {
      display: grid;
      grid-template-columns: 16px 17ch 16px 17ch;
      justify-content: start;
    }

    .next .event-list.has-preconditioning .event-time-single .target-time {
      grid-column: 4;
    }

    .next .event-identity {
      align-items: center;
      align-self: stretch;
      background: var(--secondary-background-color);
      box-shadow: 1px 0 0 var(--divider-color);
      display: flex;
      left: 0;
      padding-right: 10px;
      position: sticky;
      z-index: 4;
    }

    .settings-zone-main {
      grid-template-columns: minmax(0, 1fr);
    }

    .settings-capability-composite {
      grid-template-columns: minmax(0, 1fr);
    }

    .preconditioning-config-sections,
    .preconditioning-directions {
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

  @container (max-width: 600px) {
    .preconditioning-zone-heading {
      align-items: center;
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .preconditioning-zone-actions {
      align-items: center;
      justify-content: flex-end;
    }

    .preconditioning-enable-control.unavailable {
      justify-content: flex-end;
    }

    .preconditioning-unavailable-message {
      display: block;
      grid-column: 1 / -1;
      text-align: right;
    }

    .preconditioning-config-row,
    .preconditioning-sensor-row {
      grid-template-columns: minmax(0, 1fr) minmax(110px, 42%);
    }

    .preconditioning-learning-summary {
      grid-template-columns: minmax(0, 1fr);
    }

    .preconditioning-block-preview {
      grid-template-columns: minmax(94px, 0.72fr) minmax(146px, 1.28fr);
      min-width: 0;
    }

    .preconditioning-block-preview.normal-start {
      grid-template-columns: minmax(0, 1fr);
    }

    .preconditioning-calculation-row.context {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .preconditioning-calculation-item.samples {
      grid-column: 1 / -1;
    }

    .preconditioning-help {
      position: static;
    }

    .preconditioning-help-tooltip {
      left: 0;
      max-width: none;
      right: 0;
      top: calc(100% - 2px);
      transform: none;
      width: auto;
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
    .preconditioning-config-sections,
    .preconditioning-directions,
    .settings-reset {
      grid-template-columns: minmax(0, 1fr);
    }

    .preconditioning-zone-heading {
      align-items: center;
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .preconditioning-zone-actions {
      align-items: center;
      justify-content: flex-end;
    }

    .preconditioning-enable-control.unavailable {
      justify-content: flex-end;
    }

    .preconditioning-unavailable-message {
      display: block;
      grid-column: 1 / -1;
      text-align: right;
    }

    .preconditioning-config-row,
    .preconditioning-sensor-row {
      grid-template-columns: minmax(0, 1fr) minmax(110px, 42%);
    }

    .preconditioning-learning-summary {
      grid-template-columns: minmax(0, 1fr);
    }

    .preconditioning-block-preview {
      grid-template-columns: minmax(94px, 0.72fr) minmax(146px, 1.28fr);
      min-width: 0;
    }

    .preconditioning-block-preview.normal-start {
      grid-template-columns: minmax(0, 1fr);
    }

    .preconditioning-calculation-row.context {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .preconditioning-calculation-item.samples {
      grid-column: 1 / -1;
    }

    .preconditioning-help {
      position: static;
    }

    .preconditioning-help-tooltip {
      left: 0;
      max-width: none;
      right: 0;
      top: calc(100% - 2px);
      transform: none;
      width: auto;
    }

    .settings-reset-icon {
      display: none;
    }

    .summary {
      grid-template-columns: 1fr;
    }

    .draft-list {
      grid-template-columns: minmax(66px, 0.9fr) minmax(76px, 1fr) minmax(62px, 0.7fr) 34px 34px;
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
      width: 34px;
    }

    .advanced-climate-options summary {
      height: 34px;
      width: 34px;
    }

    .advanced-climate-options-placeholder {
      height: 34px;
      width: 34px;
    }

    .settings-zone-row {
      grid-template-columns: 28px minmax(0, 1fr);
    }

    .settings-zone-row > .settings-drag-handle {
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
`, xn = [
	ln,
	un,
	dn,
	fn,
	pn,
	mn,
	hn,
	gn,
	_n,
	vn,
	yn,
	u`
    .temperature-migration-banner {
      align-items: start;
      background: color-mix(in srgb, var(--warning-color, #c99500) 12%, var(--card-background-color));
      border: 1px solid var(--warning-color, #c99500);
      border-radius: 8px;
      color: var(--primary-text-color);
      display: grid;
      gap: 10px;
      grid-template-columns: auto minmax(0, 1fr);
      margin-bottom: 12px;
      padding: 12px;
    }

    .temperature-migration-banner ha-icon {
      color: var(--warning-color, #c99500);
    }

    .temperature-migration-banner strong,
    .temperature-migration-banner span {
      display: block;
    }

    .temperature-migration-banner span {
      color: var(--secondary-text-color);
      font-size: 12px;
      margin-top: 3px;
    }

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
      grid-template-columns: minmax(94px, 1fr) minmax(112px, 1fr) minmax(90px, 0.8fr) 40px 40px;
      overflow: visible;
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
      height: 38px;
      min-width: 0;
      padding: 0;
      width: 38px;
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

    .advanced-climate-options {
      align-self: start;
      display: block;
      grid-column: auto;
      min-width: 0;
      position: relative;
      z-index: 8;
    }

    .advanced-climate-options-placeholder {
      display: block;
      height: 38px;
      width: 38px;
    }

    .advanced-climate-options[open] {
      z-index: 1000;
    }

    .advanced-climate-options summary {
      background: transparent;
      border-color: transparent;
      color: var(--secondary-text-color);
      height: 38px;
      list-style: none;
      min-width: 0;
      padding: 0;
      position: relative;
      width: 38px;
    }

    .advanced-climate-options summary::-webkit-details-marker {
      display: none;
    }

    .advanced-climate-options summary ha-icon {
      --mdc-icon-size: 18px;
      color: var(--primary-color);
    }

    .climate-options-badge {
      align-items: center;
      background: var(--primary-color);
      border: 2px solid var(--card-background-color);
      border-radius: 999px;
      color: var(--text-primary-color);
      display: inline-flex;
      font-size: 10px;
      font-weight: 700;
      height: 17px;
      justify-content: center;
      line-height: 1;
      min-width: 17px;
      padding: 0 4px;
      position: absolute;
      right: -5px;
      top: -6px;
    }

    .advanced-climate-options[open] summary {
      background: transparent;
      border-color: transparent;
      color: var(--primary-text-color);
    }

    .advanced-climate-options summary:hover {
      background: color-mix(in srgb, var(--primary-color) 10%, transparent);
      border-color: transparent;
    }

    .climate-options-scrim {
      -webkit-backdrop-filter: blur(1px);
      backdrop-filter: blur(1px);
      background: color-mix(in srgb, var(--primary-background-color, #000) 32%, transparent);
      border: 0;
      bottom: 0;
      cursor: default;
      display: block;
      left: 0;
      padding: 0;
      position: fixed;
      right: 0;
      top: 0;
      z-index: 1000;
    }

    .advanced-climate-options-fields {
      background: color-mix(in srgb, var(--card-background-color) 96%, var(--primary-color) 4%);
      border: 1px solid color-mix(in srgb, var(--primary-color) 28%, var(--divider-color));
      border-radius: 8px;
      box-shadow: 0 18px 42px rgba(0, 0, 0, 0.34), var(--ha-card-box-shadow, 0 2px 8px rgba(0, 0, 0, 0.16));
      box-sizing: border-box;
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      margin: 0;
      max-height: min(560px, var(--climate-options-max-height, calc(100vh - 48px)));
      min-width: 0;
      overflow-y: auto;
      padding: 10px;
      position: fixed;
      left: var(--climate-options-left, 16px);
      top: var(--climate-options-top, 50%);
      transform: translateY(var(--climate-options-translate-y, 0));
      width: var(--climate-options-width, min(420px, calc(100vw - 32px)));
      z-index: 1001;
    }

    .advanced-climate-options-fields legend {
      background: var(--card-background-color);
      color: var(--secondary-text-color);
      font-size: 10px;
      font-weight: 700;
      line-height: 1;
      margin-left: 4px;
      padding: 0 5px;
      text-transform: uppercase;
    }

    .climate-options-inline-summary {
      align-self: start;
      background: color-mix(in srgb, var(--primary-color) 4%, transparent);
      border-radius: 0 0 6px 6px;
      border-top: 1px solid color-mix(in srgb, var(--primary-color) 18%, var(--divider-color));
      color: var(--secondary-text-color);
      display: block;
      font-size: 11px;
      grid-column: 1 / -1;
      line-height: 1.3;
      margin: -6px 0 4px;
      min-width: 0;
      overflow: hidden;
      padding: 6px 8px 3px 18px;
      position: relative;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .climate-options-inline-summary::before {
      background: color-mix(in srgb, var(--primary-color) 42%, transparent);
      border-radius: 999px;
      bottom: 5px;
      content: "";
      left: 8px;
      position: absolute;
      top: 6px;
      width: 2px;
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
	bn
], j = class {
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
	setClimateProfile(e) {
		return this.hass.connection.sendMessagePromise({
			type: "velair/set_profile",
			profile: e
		});
	}
	deleteClimateProfile(e) {
		return this.hass.connection.sendMessagePromise({
			type: "velair/delete_profile",
			key: e
		});
	}
	activateProfile(e) {
		return this.hass.connection.sendMessagePromise({
			type: "velair/activate_profile",
			profile_id: e ?? null
		});
	}
	setVelairMode(e) {
		return this.hass.connection.sendMessagePromise({
			type: "velair/set_mode",
			mode: e
		});
	}
	deleteVelairMode(e) {
		return this.hass.connection.sendMessagePromise({
			type: "velair/delete_mode",
			key: e
		});
	}
	selectVelairMode(e) {
		return this.hass.connection.sendMessagePromise({
			type: "velair/select_mode",
			selection: e
		});
	}
	pauseScheduler(e) {
		let t = e === void 0 ? void 0 : { duration_minutes: e };
		return this.hass.callService(Ze, "pause", t);
	}
	resumeScheduler() {
		return this.hass.callService(Ze, "resume");
	}
	updateSettings(e) {
		return this.hass.connection.sendMessagePromise({
			type: "velair/update_settings",
			...e
		});
	}
	updateZonePreconditioning(e, t) {
		return this.hass.connection.sendMessagePromise({
			type: "velair/update_zone_preconditioning",
			entity_id: e,
			preconditioning: t
		});
	}
	updateZoneComfort(e, t) {
		return this.hass.connection.sendMessagePromise({
			type: "velair/update_zone_comfort",
			entity_id: e,
			comfort: t
		});
	}
	resetZonePreconditioningLearning(e, t) {
		return this.hass.connection.sendMessagePromise({
			type: "velair/reset_zone_preconditioning_learning",
			entity_id: e,
			direction: t
		});
	}
	resetZonePreconditioningSettings(e) {
		return this.hass.connection.sendMessagePromise({
			type: "velair/reset_zone_preconditioning_settings",
			entity_id: e
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
	resolveTemperatureMigration(e, t, n) {
		return this.hass.connection.sendMessagePromise({
			type: "velair/resolve_temperature_migration",
			source_unit: e,
			migration_id: t,
			expected_revision: n
		});
	}
}, Sn = /^\d{2}:\d{2}$/;
function Cn(e) {
	if (!Sn.test(e)) return;
	let [t, n] = e.split(":").map((e) => Number(e));
	if (!(t < 0 || t > 23 || n < 0 || n > 59)) return t * 60 + n;
}
function wn(e) {
	let t = Math.min(Math.max(e, 0), 1439), n = Math.floor(t / 60), r = t % 60;
	return `${String(n).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
function Tn(e) {
	let t = e ? Cn(e) : void 0;
	if (t === void 0) return "08:00";
	let n = Math.floor(t / 60), r = t % 60, i = Math.min(n + 1, 23);
	return `${String(i).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
function En(e, t, n) {
	return Math.min(Math.max(e, t), Math.max(t, n));
}
//#endregion
//#region src/velair/domain/schedule-events.ts
function Dn(e, t, n, r = /* @__PURE__ */ new Date()) {
	if (t?.enabled) {
		if (n) {
			let r = M(n.until);
			if (r) {
				let n = new Date(r);
				return kn(e, t, n) ?? On(e, t, n);
			}
		}
		return On(e, t, r);
	}
}
function On(e, t, n) {
	let r;
	for (let i = 0; i <= 7; i += 1) {
		let a = new Date(n);
		a.setDate(n.getDate() + i);
		let o = Mn(a);
		for (let i of t.schedule?.[o] ?? []) {
			let t = jn(a, i.start);
			if (!t || t <= n) continue;
			let s = An(e, i, t, o);
			(!r || t < new Date(r.when)) && (r = s);
		}
	}
	return r;
}
function kn(e, t, n) {
	let r = Mn(n), i = n.getHours() * 60 + n.getMinutes(), a = [...t.schedule?.[r] ?? []].map((e) => ({
		block: e,
		minute: Cn(e.start)
	})).filter((e) => e.minute !== void 0).sort((e, t) => e.minute - t.minute).filter((e) => e.minute <= i).at(-1)?.block;
	return a ? An(e, a, n, r) : void 0;
}
function An(e, t, n, r) {
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
function jn(e, t) {
	let n = /^(\d{1,2}):(\d{2})$/.exec(t);
	if (!n) return;
	let r = Number(n[1]), i = Number(n[2]);
	if (r > 23 || i > 59) return;
	let a = new Date(e);
	return a.setHours(r, i, 0, 0), a;
}
function Mn(e) {
	return D[e.getDay() === 0 ? 6 : e.getDay() - 1];
}
function M(e) {
	if (typeof e != "string") return;
	let t = new Date(e).getTime();
	return Number.isNaN(t) ? void 0 : t;
}
function Nn(e, t) {
	let n = new Map(e.map((e) => [e.entity_id, e]));
	return t.filter((e) => {
		let t = n.get(e.entity_id);
		if (!t || !t.target_when && !e.target_when) return !1;
		let r = t.target_when ?? t.when, i = e.target_when ?? e.when;
		return t.weekday === e.weekday && t.start === e.start && r === i && t.when !== e.when;
	}).map((e) => e.entity_id);
}
//#endregion
//#region src/velair/domain/temperature-units.ts
function N(e) {
	return String(e ?? "").toUpperCase().includes("F");
}
function Pn(e) {
	return N(e) ? 70 : 21;
}
function Fn(e) {
	return N(e) ? 1 : .3;
}
function In(e) {
	return N(e) ? 4 : 2;
}
function Ln(e) {
	return N(e) ? 14 : 25;
}
function Rn(e, t) {
	return N(e) ? t * 9 / 5 : t;
}
function zn(e) {
	return N(e) ? [.6, 66.7] : [1, 120];
}
function Bn(e) {
	return N(e) ? [-58, 212] : [-50, 100];
}
//#endregion
//#region src/velair/domain/templates.ts
function Vn(e, t) {
	return (e ?? []).map((e) => ({
		key: e.key,
		name: e.name,
		blocks: e.blocks.map((e) => {
			let n = {
				action: e.action ?? "set_temperature",
				start: e.start,
				temperature: Number(e.temperature ?? Pn(t)),
				hvac_mode: e.hvac_mode ?? ""
			};
			return e.fan_mode && (n.fan_mode = e.fan_mode), e.preset_mode && (n.preset_mode = e.preset_mode), e.swing_mode && (n.swing_mode = e.swing_mode), e.swing_horizontal_mode && (n.swing_horizontal_mode = e.swing_horizontal_mode), e.humidity != null && (n.humidity = e.humidity), n;
		})
	}));
}
function Hn(e) {
	return e.name ?? e.key;
}
function Un(e, t) {
	let n = new Set(t.map((e) => Hn(e)));
	if (!n.has(e)) return e;
	let r = 2;
	for (; n.has(`${e} ${r}`);) r += 1;
	return `${e} ${r}`;
}
function Wn(e = Date.now(), t = Math.random()) {
	return `custom_${e.toString(36)}_${t.toString(36).slice(2, 8)}`;
}
function Gn(e, t) {
	return `${e}::${t}`;
}
function Kn(e, t, n, r) {
	let i = Gn(t, n), a = new Set(e);
	return r ? a.add(i) : a.delete(i), a;
}
function qn(e, t) {
	return [...e].map((e) => {
		let [t, n] = e.split("::");
		return {
			entityId: t,
			weekday: n
		};
	}).filter((e) => !!e.entityId && D.includes(e.weekday) && t.includes(e.entityId));
}
//#endregion
//#region src/velair/domain/overrides.ts
function Jn(e, t = Date.now()) {
	if (!e || e.type !== "boost") return !1;
	let n = Number(e.temperature), r = M(e.until);
	return Number.isFinite(n) && !!(r && r > t);
}
function Yn(e, t = Date.now()) {
	if (!e || e.type !== "pause") return !1;
	let n = M(e.until);
	return Object.prototype.hasOwnProperty.call(e, "until") && n === void 0 ? !1 : n === void 0 || n > t;
}
//#endregion
//#region src/velair/domain/timeline.ts
function Xn(e) {
	return e.getHours() * 60 + e.getMinutes();
}
function Zn(e) {
	let t = Xn(e);
	return {
		label: wn(t),
		left: t / 1440 * 100,
		minute: t
	};
}
function Qn(e, t, n, r) {
	let i = Math.max(0, t - n);
	if (i <= 1) return 0;
	let a = Math.max(0, Math.min(100, e)), o = Math.max(0, t - r), s = Math.max(0, n - r), c = r + a / 100 * o, l = r + s * .35;
	return Math.max(0, Math.min(i, c - l));
}
function $n(e) {
	let t = e.map((e, t) => ({
		draft: e,
		index: t,
		startMinute: Cn(e.start)
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
function er(e) {
	let t = e.map((e, t) => ({
		block: e,
		index: t,
		startMinute: Cn(e.start)
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
function tr(e, t = /* @__PURE__ */ new Date()) {
	if (!Jn(e, t.getTime())) return;
	let n = ir(e.until);
	if (!n) return;
	let r = ir(e.started_at) ?? t.getTime(), i = new Date(t);
	i.setHours(0, 0, 0, 0);
	let a = new Date(i);
	a.setDate(i.getDate() + 1);
	let o = Math.max(r, i.getTime()), s = Math.min(n, a.getTime());
	if (s <= o || o >= a.getTime() || s <= i.getTime()) return;
	let c = Math.max(0, Math.min(1440, Math.round((o - i.getTime()) / 6e4))), l = Math.max(c + 1, Math.min(1440, Math.round((s - i.getTime()) / 6e4))), u = c / 1440 * 100, d = (l - c) / 1440 * 100, f = Number(e.temperature), p = typeof e.hvac_mode == "string" ? e.hvac_mode : void 0;
	return {
		block: {
			action: Ye,
			start: wn(c),
			...Number.isFinite(f) ? { temperature: f } : {},
			...p ? { hvac_mode: p } : {}
		},
		endMinute: l,
		left: u,
		startMinute: c,
		width: Math.max(Math.min(d, 100 - u), .5)
	};
}
function nr(e, t = /* @__PURE__ */ new Date()) {
	if (!Yn(e, t.getTime())) return;
	let n = ir(e.until), r = new Date(t);
	r.setHours(0, 0, 0, 0);
	let i = new Date(r);
	if (i.setDate(r.getDate() + 1), !n) return {
		endMinute: 1440,
		indefinite: !0,
		left: 0,
		startMinute: 0,
		width: 100
	};
	let a = ir(e.started_at) ?? t.getTime(), o = Math.max(a, r.getTime()), s = Math.min(n, i.getTime());
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
function rr(e) {
	return e.map((e, t) => ({
		block: e,
		index: t,
		startMinute: Cn(e.start)
	})).sort((e, t) => e.startMinute === void 0 && t.startMinute === void 0 ? e.index - t.index : e.startMinute === void 0 ? 1 : t.startMinute === void 0 ? -1 : e.startMinute - t.startMinute || e.index - t.index).map((e) => e.block);
}
function ir(e) {
	if (typeof e != "string") return;
	let t = new Date(e).getTime();
	return Number.isNaN(t) ? void 0 : t;
}
function ar(e, t, n) {
	let r = n > 0 ? (e - t) / n : 0, i = Math.round(Math.min(Math.max(r, 0), 1) * 1440 / 15) * 15;
	return Math.min(i, 1425);
}
function or(e) {
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
//#region src/velair/domain/scheduler-state.ts
function sr(e) {
	return M(e?.paused_until);
}
function cr(e) {
	return M(e?.paused_started_at);
}
function lr(e, t, n = Date.now()) {
	if (!e || e >= t) return 100;
	let r = Math.max(1, t - e), i = Math.max(0, t - n);
	return Math.min(100, Math.max(0, i / r * 100));
}
function ur(e, t = Date.now()) {
	return e - t <= 9e4 ? 500 : 1e4;
}
function dr(e, t, n = Date.now()) {
	let r = [sr(e), ...Object.values(t ?? {}).map((e) => M(e.until))].filter((e) => typeof e == "number" && e > n);
	return r.length ? Math.min(...r) : void 0;
}
//#endregion
//#region src/velair/controllers/scheduler-controls.ts
function P(e) {
	return e;
}
function fr(e) {
	return e._data?.global.mode === "paused" || e._data?.operational_status === "paused";
}
async function pr(e, t, n = {}) {
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
async function mr(e, t = {}) {
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
function hr(e) {
	let t = e.renderRoot.querySelector(".scheduler-menu");
	t instanceof HTMLDetailsElement && (t.open = !1), e._schedulerMenuOpen = !1;
}
function gr(e, t) {
	let n = t.currentTarget.closest(".scheduler-menu");
	e._schedulerMenuOpen = n instanceof HTMLDetailsElement ? !n.open : !e._schedulerMenuOpen;
}
function _r(e) {
	e._nextEventsOpen = !e._nextEventsOpen;
}
function vr(e) {
	return sr(e._data?.global);
}
function yr(e, t) {
	return lr(cr(e._data?.global), t);
}
function br(e) {
	let t = xr(e);
	if (!t || t <= Date.now()) {
		e._stopPauseTick();
		return;
	}
	let n = ur(t);
	(!e._pauseTick || e._pauseTickDelay !== n) && (e._stopPauseTick(), e._pauseTickDelay = n, e._pauseTick = window.setInterval(() => {
		let t = e._nextCountdownExpirationMs();
		!t || t <= Date.now() ? e._stopPauseTick() : e._pauseTickDelay !== ur(t) && e._syncPauseTick(), e.requestUpdate();
	}, n));
}
function xr(e) {
	return dr(e._data?.global, e._data?.active_overrides);
}
function Sr(e) {
	e._pauseTick && (window.clearInterval(e._pauseTick), e._pauseTick = void 0, e._pauseTickDelay = void 0);
}
//#endregion
//#region src/velair/controllers/notice-actions.ts
function Cr(e) {
	return e;
}
function wr(e, t) {
	t === "error" && (e._error = void 0), t === "success" && (e._saveMessage = void 0, Dr(e));
}
function Tr(e, t) {
	e._saveMessage = t, e._successNoticeStartedAt = Date.now(), Dr(e, !1), e._successNoticeTimeout = window.setTimeout(() => {
		e._saveMessage = void 0, Dr(e);
	}, Qe), e._successNoticeTick = window.setInterval(() => e.requestUpdate(), 1e3);
}
function Er(e) {
	if (!e._successNoticeStartedAt) return 100;
	let t = Date.now() - e._successNoticeStartedAt;
	return Math.max(0, Math.min(100, (Qe - t) / Qe * 100));
}
function Dr(e, t = !0) {
	e._successNoticeTimeout &&= (window.clearTimeout(e._successNoticeTimeout), void 0), e._successNoticeTick &&= (window.clearInterval(e._successNoticeTick), void 0), t && (e._successNoticeStartedAt = void 0);
}
//#endregion
//#region src/velair/domain/draft-blocks.ts
function Or(e, t) {
	return e.map((e) => {
		let n = {
			action: e.action ?? "set_temperature",
			start: e.start,
			temperature: Number(e.temperature ?? Pn(t)),
			hvac_mode: e.hvac_mode ?? ""
		};
		return e.fan_mode && (n.fan_mode = e.fan_mode), e.preset_mode && (n.preset_mode = e.preset_mode), e.swing_mode && (n.swing_mode = e.swing_mode), e.swing_horizontal_mode && (n.swing_horizontal_mode = e.swing_horizontal_mode), e.humidity != null && (n.humidity = e.humidity), n;
	});
}
function kr(e, t, n) {
	let r = e[e.length - 1];
	return [...e, {
		action: Ye,
		start: t,
		temperature: Number(r?.temperature || Pn(n)),
		hvac_mode: ""
	}];
}
function Ar(e, t) {
	return e.filter((e, n) => n !== t);
}
function jr(e, t, n, r) {
	return e[t] ? e.map((e, i) => i === t ? n === "hvac_mode" ? {
		...e,
		action: r === "off" ? Xe : Ye,
		hvac_mode: r === "off" ? "" : r
	} : {
		...e,
		[n]: r
	} : e) : e;
}
function Mr(e, t) {
	if ((e.action || "set_temperature") === "turn_off") return;
	let n = String(e.temperature ?? "").trim();
	if (!n || !/^\d+(\.\d+)?$/.test(n)) return t.rangeError;
	let r = Number(n);
	if (!Number.isFinite(r) || r < t.minTemperature || r > t.maxTemperature) return t.rangeError;
	if (t.temperatureStep !== void 0 && Math.abs(r / t.temperatureStep - Math.round(r / t.temperatureStep)) > 1e-4) return t.stepError;
}
function Nr(e, t) {
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
				action: Xe
			}), n.add(e);
			continue;
		}
		let s = t.temperatureError(i);
		if (s) return {
			ok: !1,
			error: t.invalidTemperatureError(e, s)
		};
		let c = {
			action: Ye,
			start: e,
			temperature: Number(i.temperature)
		};
		if (i.hvac_mode && (c.hvac_mode = i.hvac_mode), i.fan_mode && (c.fan_mode = i.fan_mode), i.preset_mode && (c.preset_mode = i.preset_mode), i.swing_mode && (c.swing_mode = i.swing_mode), i.swing_horizontal_mode && (c.swing_horizontal_mode = i.swing_horizontal_mode), String(i.humidity ?? "").trim()) {
			let e = Number(i.humidity);
			Number.isFinite(e) && (c.humidity = e);
		}
		r.push(c), n.add(e);
	}
	return {
		ok: !0,
		blocks: r.sort((e, t) => e.start.localeCompare(t.start))
	};
}
function Pr(e, t, n) {
	return e.map((e) => (e.action || "set_temperature") === "turn_off" || e.temperature == null ? { ...e } : {
		...e,
		temperature: Math.min(n, Math.max(t, Number(e.temperature)))
	});
}
function Fr(e, t) {
	let n = new Set(t);
	return e.find((e) => (e.action || "set_temperature") !== "turn_off" && !!e.hvac_mode && !n.has(e.hvac_mode ?? ""));
}
function Ir(e, t) {
	return e.map((e) => {
		if ((e.action || "set_temperature") === "turn_off") return {
			start: e.start,
			action: Xe
		};
		let n = { ...e };
		return t.fanModes.includes(n.fan_mode ?? "") || delete n.fan_mode, t.presetModes.includes(n.preset_mode ?? "") || delete n.preset_mode, t.swingModes.includes(n.swing_mode ?? "") || delete n.swing_mode, t.swingHorizontalModes.includes(n.swing_horizontal_mode ?? "") || delete n.swing_horizontal_mode, (n.humidity == null || !t.humidityLimits || n.humidity < t.humidityLimits[0] || n.humidity > t.humidityLimits[1]) && delete n.humidity, n;
	});
}
//#endregion
//#region src/velair/controllers/draft-actions.ts
function F(e) {
	return e;
}
function Lr(e, t = "schedule") {
	let n = e._blocksForSource(t), r = e._temperatureUnit(t === "schedule" ? e._selectedEntity : void 0);
	e._setBlocksForSource(t, kr(n, Tn(n.at(-1)?.start), r)), e._markBlocksDirty(t), e._saveMessage = void 0;
}
function Rr(e, t, n = "schedule") {
	e._setBlocksForSource(n, Ar(e._blocksForSource(n), t)), e._markBlocksDirty(n), e._saveMessage = void 0;
}
function zr(e, t, n, r, i = "schedule") {
	let a = e._blocksForSource(i);
	a[t] && (e._setBlocksForSource(i, jr(a, t, n, r)), e._markBlocksDirty(i), e._saveMessage = void 0);
}
function Br(e) {
	e._dirty = !0, e._dirtyEntityId = e._selectedEntity;
}
function Vr(e, t, n, r = {}, i = "schedule") {
	let a = e._blocksForSource(i);
	a[t] && (e._setBlocksForSource(i, a.map((e, r) => r === t ? {
		...e,
		start: n
	} : e)), r.sort && e._setBlocksForSource(i, rr(e._blocksForSource(i))), e._markBlocksDirty(i), e._saveMessage = void 0);
}
function Hr(e, t, n) {
	!D.includes(t) || t === e._selectedWeekday || (e._copyTargets = Gt(e._copyTargets, t, n), e._saveMessage = void 0);
}
function Ur(e, t, n) {
	!(e._data?.configured_entities ?? []).includes(t) || t === e._selectedEntity || (e._zoneTargets = Gt(e._zoneTargets, t, n), e._saveMessage = void 0);
}
//#endregion
//#region src/velair/controllers/draft-validation.ts
function Wr(e) {
	return e;
}
function Gr(e, t = "schedule") {
	return e._blocksForSource(t).some((n) => !!Kr(e, n, t));
}
function Kr(e, t, n = "schedule") {
	let [r, i] = e._temperatureLimits(n), a = e._temperatureStep(n);
	return Mr(t, {
		maxTemperature: i,
		minTemperature: r,
		rangeError: e._t("invalidTemperatureRange", {
			min: e._formatTemperatureLimit(r),
			max: e._formatTemperatureLimit(i)
		}),
		stepError: e._t("invalidTemperatureStep", { step: a === void 0 ? "" : e._formatTemperatureLimit(a) }),
		temperatureStep: a
	});
}
//#endregion
//#region src/velair/domain/portable.ts
function qr(e) {
	let t = Number(e?.model_version), n = e?.temperature_unit, r = n === void 0 || n === "°C" || t >= 3 && n === "°F";
	if (!e || e.format !== "velair_portable_data" || !Number.isInteger(e.model_version) || t < 1 || t > 5 || !r || !e.sections || typeof e.sections != "object") return {
		ok: !1,
		errorKey: "invalidImportFile"
	};
	let i = Jr(e);
	return i.length ? {
		ok: !0,
		sections: i
	} : {
		ok: !1,
		errorKey: "noImportSections"
	};
}
function Jr(e) {
	let t = e?.sections;
	return !t || typeof t != "object" ? [] : nt.filter((e) => Object.prototype.hasOwnProperty.call(t, e));
}
function Yr(e, t) {
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
	}), e.has("preconditioning_learning") && n.push({
		section: "preconditioning_learning",
		value: t.preconditioningLearning
	}), e.has("profiles") && n.push({
		section: "profiles",
		value: t.profiles
	}), e.has("modes") && n.push({
		section: "modes",
		value: t.modes
	}), n;
}
function Xr(e) {
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
	if (Object.prototype.hasOwnProperty.call(t, "settings") && n.push({
		section: "settings",
		value: "included"
	}), Object.prototype.hasOwnProperty.call(t, "preconditioning_learning")) {
		let e = t.preconditioning_learning;
		n.push({
			section: "preconditioning_learning",
			value: e && typeof e == "object" && !Array.isArray(e) ? Object.keys(e).length : 0
		});
	}
	return Object.prototype.hasOwnProperty.call(t, "profiles") && n.push({
		section: "profiles",
		value: Array.isArray(t.profiles) ? t.profiles.length : 0
	}), Object.prototype.hasOwnProperty.call(t, "modes") && n.push({
		section: "modes",
		value: Array.isArray(t.modes) ? t.modes.length : 0
	}), n;
}
function Zr(e, t) {
	let n = e?.sections?.preconditioning_learning;
	if (!n || typeof n != "object" || Array.isArray(n)) return [];
	let r = new Set(t);
	return Object.keys(n).filter((e) => !r.has(e));
}
//#endregion
//#region src/velair/controllers/portability-actions.ts
function I(e) {
	return e;
}
function Qr(e, t, n, r) {
	let i = new Set(t === "export" ? e._exportSections : e._importSections);
	r ? i.add(n) : i.delete(n), t === "export" ? e._exportSections = i : e._importSections = i;
}
async function $r(e, t) {
	let n = t.currentTarget, r = n.files?.[0];
	if (e._importPayload = void 0, e._importFileName = "", e._importSections = /* @__PURE__ */ new Set(), e._error = void 0, e._saveMessage = void 0, r) try {
		let t = JSON.parse(await r.text()), n = qr(t);
		if (!n.ok) throw Error(e._t(n.errorKey));
		e._importPayload = t, e._importFileName = r.name, e._importSections = new Set(n.sections);
	} catch (t) {
		e._error = t instanceof Error ? t.message : e._t("invalidImportFile"), n.value = "";
	}
}
async function ei(e) {
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
async function ti(e) {
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
async function ni(e) {
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
function ri(e) {
	return Jr(e._importPayload);
}
function ii(e) {
	return Yr(new Set(nt), {
		zones: e._data?.configured_entities.length ?? 0,
		templates: e._scheduleTemplates().length,
		preconditioningLearning: Object.values(e._data?.preconditioning_learning ?? {}).filter((e) => e.total_samples > 0).length,
		profiles: e._data?.profiles?.length ?? 0,
		modes: e._data?.modes?.length ?? 0
	}).map((t) => e._portableSummaryItem(t));
}
function ai(e) {
	return Xr(e._importPayload).map((t) => e._portableSummaryItem(t));
}
function oi(e, t) {
	let n = e._portableSectionLabel(t.section);
	return {
		label: n,
		section: t.section,
		title: n,
		value: t.value === "included" ? e._t("portabilityIncluded") : t.value
	};
}
function si(e, t) {
	switch (t) {
		case "modes": return e._t("portabilityModesSection");
		case "profiles": return e._t("portabilityProfilesSection");
		case "preconditioning_learning": return e._t("portabilityPreconditioningLearningSection");
		case "templates": return e._t("portabilityTemplatesSection");
		case "settings": return e._t("portabilitySettingsSection");
		default: return e._t("portabilityZonesSection");
	}
}
function ci(e) {
	let t = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), n = new Blob([JSON.stringify(e, null, 2)], { type: "application/json" }), r = URL.createObjectURL(n), i = document.createElement("a");
	i.href = r, i.download = `velair-export-${t}.json`, i.style.display = "none", document.body.append(i), i.click(), i.remove(), URL.revokeObjectURL(r);
}
//#endregion
//#region src/velair/controllers/settings-actions.ts
function L(e) {
	return e;
}
async function li(e, t) {
	let n = D.includes(t) ? t : "monday";
	e._selectedWeekday = n, e._copyTargets = /* @__PURE__ */ new Set(), e._zoneTargets = /* @__PURE__ */ new Set(), await e._saveSettings({ first_weekday: n }), e._resetDraftBlocks();
}
async function ui(e, t) {
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
async function di(e, t, n) {
	let r = e._api();
	if (r) {
		e._settingsSaving = !0, e._error = void 0, e._saveMessage = void 0;
		try {
			let i = await r.updateZonePreconditioning(t, n);
			e._applyScheduleData(i);
		} catch (t) {
			e._error = t instanceof Error ? t.message : e._t("unableSaveSettings");
		} finally {
			e._settingsSaving = !1;
		}
	}
}
async function fi(e, t, n) {
	let r = e._api();
	if (r) {
		e._settingsSaving = !0, e._error = void 0, e._saveMessage = void 0;
		try {
			let i = await r.updateZoneComfort(t, n);
			e._applyScheduleData(i);
		} catch (t) {
			e._error = t instanceof Error ? t.message : e._t("unableSaveSettings");
		} finally {
			e._settingsSaving = !1;
		}
	}
}
async function pi(e, t, n, r) {
	let i = e._api();
	if (i && window.confirm(e._t("confirmResetPreconditioningLearning", { direction: r }))) {
		e._settingsSaving = !0, e._error = void 0, e._saveMessage = void 0;
		try {
			let a = await i.resetZonePreconditioningLearning(t, n);
			e._applyScheduleData(a), e._showSuccess(e._t("preconditioningLearningResetDone", { direction: r }));
		} catch (t) {
			e._error = t instanceof Error ? t.message : e._t("unableSaveSettings");
		} finally {
			e._settingsSaving = !1;
		}
	}
}
async function mi(e, t) {
	let n = e._api();
	if (n && window.confirm(e._t("confirmResetPreconditioningSettings"))) {
		e._settingsSaving = !0, e._error = void 0, e._saveMessage = void 0;
		try {
			let r = await n.resetZonePreconditioningSettings(t);
			e._applyScheduleData(r), e._showSuccess(e._t("preconditioningSettingsResetDone"));
		} catch (t) {
			e._error = t instanceof Error ? t.message : e._t("unableSaveSettings");
		} finally {
			e._settingsSaving = !1;
		}
	}
}
function hi(e, t, n) {
	let r = e._orderedZoneIds(e._data?.configured_entities ?? []), i = r.indexOf(t), a = i + n;
	if (i < 0 || a < 0 || a >= r.length) return;
	let o = [...r];
	[o[i], o[a]] = [o[a], o[i]], e._updateSettingsZoneOrder(o);
}
function gi(e, t, n) {
	e._draggedSettingsEntity = t, n.dataTransfer?.setData("text/plain", t), n.dataTransfer && (n.dataTransfer.effectAllowed = "move");
}
function _i(e) {
	e.preventDefault(), e.dataTransfer && (e.dataTransfer.dropEffect = "move");
}
function vi(e, t, n) {
	n.preventDefault();
	let r = n.dataTransfer?.getData("text/plain") || e._draggedSettingsEntity;
	if (e._draggedSettingsEntity = void 0, !r || r === t) return;
	let i = e._orderedZoneIds(e._data?.configured_entities ?? []).filter((e) => e !== r), a = i.indexOf(t);
	a < 0 || (i.splice(a, 0, r), e._updateSettingsZoneOrder(i));
}
function yi(e) {
	e._draggedSettingsEntity = void 0;
}
function bi(e, t) {
	let n = new Set(e._data?.configured_entities ?? []), r = t.filter((e) => n.has(e));
	e._saveSettings({ zone_order: r });
}
//#endregion
//#region src/velair/controllers/timeline-interactions.ts
function R(e) {
	return e;
}
function xi(e, t, n, r) {
	e._draggedTimelineIndex = t, r.dataTransfer?.setData("text/plain", JSON.stringify({
		index: t,
		source: n
	})), r.dataTransfer && (r.dataTransfer.effectAllowed = "move");
}
function Si(e) {
	e.preventDefault(), e.dataTransfer && (e.dataTransfer.dropEffect = "move");
}
function Ci(e, t, n = "schedule") {
	t.preventDefault();
	let { index: r, source: i } = wi(e, t, n);
	if (e._draggedTimelineIndex = void 0, !Number.isInteger(r) || !e._blocksForSource(i)[r]) return;
	let a = t.currentTarget, o = Mi(e, t.clientX, a);
	e._setDraftBlockStart(r, o, { sort: !0 }, i);
}
function wi(e, t, n) {
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
function Ti(e) {
	e._draggedTimelineIndex = void 0;
}
function Ei(e, t, n, r, i) {
	i.preventDefault(), i.stopPropagation();
	let a = i.currentTarget.closest(".timeline-track");
	a instanceof HTMLElement && (e._timelineResize = {
		edge: n,
		index: t,
		source: r,
		track: a
	}, e.classList.add("timeline-resizing"), Pi(e, "ew-resize"), window.addEventListener("pointermove", e._handleTimelineResizeMove), window.addEventListener("pointerup", e._handleTimelineResizeEnd, { once: !0 }), e._resizeTimelineBlock(t, n, Ni(i.clientX, a), r));
}
function Di(e, t) {
	if (!e._timelineResize) return;
	t.preventDefault();
	let { edge: n, index: r, source: i, track: a } = e._timelineResize;
	e._resizeTimelineBlock(r, n, Ni(t.clientX, a), i);
}
function Oi(e) {
	window.removeEventListener("pointermove", e._handleTimelineResizeMove);
	let t = e._timelineResize?.source ?? "schedule";
	e.classList.remove("timeline-resizing"), e._timelineResize = void 0, Fi(e), e._sortDraftBlocksByStart(t);
}
function ki(e, t, n, r, i = "schedule") {
	let a = ji(e, i), o = a.findIndex((e) => e.index === t), s = a[o];
	if (!s) return;
	if (n === "start") {
		let n = a[o - 1]?.startMinute, c = typeof n == "number" ? n + 15 : 0, l = s.endMinute - 15;
		e._setDraftBlockStart(t, wn(En(r, c, l)), {}, i);
		return;
	}
	let c = a[o + 1];
	if (!c) return;
	let l = a[o + 2]?.startMinute, u = s.startMinute + 15, d = typeof l == "number" ? l - 15 : 1425;
	e._setDraftBlockStart(c.index, wn(En(r, u, d)), {}, i);
}
function Ai(e, t = "schedule") {
	e._setBlocksForSource(t, rr(e._blocksForSource(t)));
}
function ji(e, t = "schedule") {
	return $n(e._blocksForSource(t));
}
function Mi(e, t, n) {
	return wn(Ni(t, n));
}
function Ni(e, t) {
	let n = t.getBoundingClientRect();
	return ar(e, n.left, n.width);
}
function Pi(e, t) {
	document.body && (e._previousBodyCursor === void 0 && (e._previousBodyCursor = document.body.style.cursor), e._previousDocumentCursor === void 0 && (e._previousDocumentCursor = document.documentElement.style.cursor), document.body.style.cursor = t, document.documentElement.style.cursor = t);
}
function Fi(e) {
	!document.body || e._previousBodyCursor === void 0 || (document.body.style.cursor = e._previousBodyCursor, document.documentElement.style.cursor = e._previousDocumentCursor ?? "", e._previousBodyCursor = void 0, e._previousDocumentCursor = void 0);
}
//#endregion
//#region src/velair/controllers/schedule-actions.ts
function Ii(e) {
	return e;
}
async function Li(e) {
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
async function Ri(e) {
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
async function zi(e) {
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
function Bi(e, t = "schedule") {
	return Nr(e._blocksForSource(t), {
		duplicateStartError: (t) => e._t("duplicateStart", { start: t }),
		invalidStartError: (t) => e._t("invalidStart", { start: t }),
		invalidTemperatureError: (t, n) => `${e._t("invalidTemperature", { start: t })}: ${n}`,
		temperatureError: (n) => e._temperatureError(n, t)
	});
}
function Vi(e, t, n) {
	let [r, i] = e._entityTemperatureLimits(n);
	return Ir(Pr(t, r, i), {
		fanModes: e._entityFanModeOptions(n),
		humidityLimits: e._entityHumidityLimits(n),
		presetModes: e._entityPresetModeOptions(n),
		swingHorizontalModes: e._entitySwingHorizontalModeOptions(n),
		swingModes: e._entitySwingModeOptions(n)
	});
}
function Hi(e, t, n) {
	let r = Fr(t, e._climateSupportedModes(n));
	if (r?.hvac_mode) return e._t("unsupportedModeForClimate", {
		entity: e._friendlyEntityName(n),
		mode: e._modeLabel(r.hvac_mode),
		start: r.start
	});
}
//#endregion
//#region src/velair/controllers/schedule-state.ts
function z(e) {
	return e;
}
async function Ui(e) {
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
async function Wi(e) {
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
function Gi(e, t, n = {}) {
	let r = !e._data;
	e._data = t, e._hasExternalConfig || (e._config = {
		first_weekday: t.settings.first_weekday,
		zone_order: t.settings.zone_order
	}), r && (e._selectedWeekday = t.settings.first_weekday);
	let i = e._orderedZoneIds(t.configured_entities), a = e._visibleZoneIds(t.configured_entities);
	(!e._selectedEntity || !t.configured_entities.includes(e._selectedEntity)) && (e._selectedEntity = i[0]), a.length && e._selectedEntity && !a.includes(e._selectedEntity) && (e._selectedEntity = a[0]), e._selectedTemplateKey && !e._scheduleTemplates().some((t) => t.key === e._selectedTemplateKey) && (e._selectedTemplateKey = "");
	let o = e._scheduleTemplates().find((t) => t.key === e._selectedTemplateKey);
	o ? (n.forceDraft || !e._templateDirty || e._templateDraftKey !== o.key) && e._resetTemplateDraft(o) : e._resetTemplateDraft(), e._syncPauseTick(), (n.forceDraft || !e._dirty) && e._resetDraftBlocks();
}
function Ki(e) {
	e._draftBlocks = Or((e._selectedEntity ? e._data?.zones[e._selectedEntity] : void 0)?.schedule?.[e._selectedWeekday] ?? [], e._temperatureUnit(e._selectedEntity)), e._dirty = !1, e._dirtyEntityId = void 0;
}
function qi(e, t) {
	e._selectedEntity = t, e._saveMessage = void 0, e._copyTargets = /* @__PURE__ */ new Set(), e._zoneTargets = /* @__PURE__ */ new Set(), e._resetDraftBlocks();
}
function Ji(e, t) {
	D.includes(t) && (e._selectedWeekday = t, e._saveMessage = void 0, e._copyTargets = /* @__PURE__ */ new Set(), e._zoneTargets = /* @__PURE__ */ new Set(), e._resetDraftBlocks());
}
function Yi(e, t) {
	return t === "template" ? e._templateDraftBlocks : e._draftBlocks;
}
function Xi(e, t, n) {
	if (t === "template") {
		e._templateDraftBlocks = n;
		return;
	}
	e._draftBlocks = n;
}
function Zi(e, t) {
	if (t === "template") {
		e._templateDirty = !0;
		return;
	}
	e._markDirty();
}
//#endregion
//#region src/velair/domain/entity-diagnostics.ts
function Qi(e, t, n) {
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
function $i(e) {
	return {
		de: "de-DE",
		en: "en",
		es: "es-ES",
		fr: "fr-FR",
		nl: "nl-NL"
	}[e] ?? "en";
}
function ea(e) {
	let t = String(e ?? "").toLowerCase(), n = t === "12" ? !0 : t === "24" ? !1 : void 0;
	return {
		hour: "numeric",
		minute: "2-digit",
		...n === void 0 ? {} : { hour12: n }
	};
}
function ta(e, t, n) {
	let r = new Date(e);
	return Number.isNaN(r.getTime()) ? e : r.toLocaleString(t, {
		...ea(n),
		weekday: "short"
	});
}
function na(e, t, n) {
	let r = /^(\d{1,2}):(\d{2})$/.exec(e);
	if (!r) return e;
	let i = Number(r[1]), a = Number(r[2]);
	return i < 0 || i > 23 || a < 0 || a > 59 ? e : new Date(2e3, 0, 1, i, a).toLocaleTimeString(t, ea(n));
}
function ra(e) {
	let t = Math.max(0, Math.ceil(e / 1e3));
	if (t < 60) return `${t} s`;
	let n = Math.floor(t / 60);
	if (n < 60) return `${n} min`;
	let r = Math.floor(n / 60), i = n % 60;
	return i ? `${r} h ${i} min` : `${r} h`;
}
function ia(e, t) {
	return `${e.toFixed(e % 1 == 0 ? 0 : 1)} ${t}`;
}
function aa(e, t) {
	return e ?? t ?? "°C";
}
function oa(e, t, n) {
	return e.action === "turn_off" ? t.off : e.temperature == null ? t.setTemperature : n(Number(e.temperature), e.entity_id);
}
function sa(e, t, n) {
	return e.hvac_mode ? n(e.hvac_mode) : e.action === "turn_off" ? n("off") : t.keepMode;
}
//#endregion
//#region src/velair/controllers/climate-display.ts
function B(e) {
	return e;
}
function ca(e, t = "schedule", n = e._selectedEntity) {
	return t === "template" ? e._templateTemperatureLimits() : e._entityTemperatureLimits(n);
}
function la(e, t) {
	return Ct(t ? e.hass?.states?.[t] : void 0, e._temperatureUnit(t));
}
function ua(e) {
	return Ht((e._data?.configured_entities ?? []).map((t) => e._entityTemperatureLimits(t)));
}
function da(e, t = "schedule", n = e._selectedEntity) {
	return t === "template" ? Ut((e._data?.configured_entities ?? []).map((t) => e._entityTemperatureStep(t))) : e._entityTemperatureStep(n);
}
function fa(e, t) {
	return wt(t ? e.hass?.states?.[t] : void 0);
}
function pa(e, t) {
	return !!e.hass?.states?.[t];
}
function ma(e, t) {
	return e.hass?.states?.[t]?.attributes?.friendly_name ?? t;
}
function ha(e, t) {
	return Et(e.hass?.states?.[t]);
}
function ga(e, t = "schedule") {
	return t === "template" ? e._uniqueModes((e._data?.configured_entities ?? []).flatMap((t) => e._climateSupportedModes(t))) : e._uniqueModes(e._selectedEntity ? e._climateSupportedModes(e._selectedEntity) : []);
}
function _a(e, t = "schedule") {
	return Ra(e, t, Dt);
}
function va(e, t) {
	return Oa(Dt(e.hass?.states?.[t]));
}
function ya(e, t = "schedule") {
	return Ra(e, t, Ot);
}
function ba(e, t) {
	return Oa(Ot(e.hass?.states?.[t]));
}
function xa(e, t = "schedule") {
	return Ra(e, t, kt);
}
function Sa(e, t) {
	return Oa(kt(e.hass?.states?.[t]));
}
function Ca(e, t = "schedule") {
	return Ra(e, t, At);
}
function wa(e, t) {
	return Oa(At(e.hass?.states?.[t]));
}
function Ta(e, t = "schedule") {
	if (t === "template") {
		let t = (e._data?.configured_entities ?? []).map((t) => jt(e.hass?.states?.[t])).filter((e) => !!e);
		return t.length ? [Math.min(...t.map((e) => e[0])), Math.max(...t.map((e) => e[1]))] : void 0;
	}
	return e._selectedEntity ? jt(e.hass?.states?.[e._selectedEntity]) : void 0;
}
function Ea(e, t) {
	return jt(e.hass?.states?.[t]);
}
function Da(e) {
	return Mt(e);
}
function Oa(e) {
	return [...new Set(e)].sort((e, t) => e.localeCompare(t));
}
function ka(e, t) {
	let n = Qi(t, e.hass?.states?.[t], e._climateSupportedModes(t)), r = n.messageKeys.map((t) => e._t(t));
	return {
		messages: r,
		status: n.status,
		tooltip: r.length ? r.join(" · ") : e._t("entityDiagnosticOk")
	};
}
function Aa(e, t) {
	return Nt(e.hass?.states?.[t]).map((t) => ({
		icon: t.icon,
		label: e._t(t.labelKey)
	}));
}
function ja(e, t) {
	return ta(t, e._dateLocale(), e.hass?.locale?.time_format);
}
function Ma(e, t) {
	return na(t, e._dateLocale(), e.hass?.locale?.time_format);
}
function Na(e) {
	return $i(e._language());
}
function Pa(e, t, n) {
	return ia(t, e._temperatureUnit(n));
}
function Fa(e, t) {
	return oa(t, {
		off: e._t("off"),
		setTemperature: e._t("setTemperature")
	}, (t, n) => e._formatTemperature(t, n));
}
function Ia(e, t) {
	return sa(t, { keepMode: e._t("keepMode") }, (t) => e._modeLabel(t));
}
function La(e, t) {
	return e._data?.temperature_unit ?? aa(void 0, e.hass?.config?.unit_system?.temperature);
}
function Ra(e, t, n) {
	return Oa(t === "template" ? (e._data?.configured_entities ?? []).flatMap((t) => n(e.hass?.states?.[t])) : e._selectedEntity ? n(e.hass?.states?.[e._selectedEntity]) : []);
}
//#endregion
//#region src/velair/controllers/template-actions.ts
function V(e) {
	return e;
}
function za(e, t) {
	e._selectedTemplateKey = t;
	let n = e._scheduleTemplates().find((e) => e.key === t);
	if (e._templateDraftKey !== t && (e._resetTemplateDraft(n), e._templateApplyOpen = !1, e._templateApplyTargets = /* @__PURE__ */ new Set()), e._templateNameDraftKey === t) {
		e._saveMessage = void 0;
		return;
	}
	e._templateNameDraftKey = t, e._templateNameDraft = n ? e._templateLabel(n) : "", e._saveMessage = void 0;
}
function Ba(e, t) {
	let n = e._selectedTemplateKey;
	if (e._selectedTemplateKey = t, e._saveMessage = void 0, t) {
		if (!e._applySelectedTemplate()) {
			e._selectedTemplateKey = n;
			return;
		}
		e._selectedTemplateKey = "";
	}
}
function Va(e, t) {
	e._templateDraftKey = t?.key ?? "", e._templateDraftBlocks = t ? to(t.blocks) : [], e._templateDirty = !1;
}
function Ha(e, t) {
	let n = ["template-list-wrap"];
	return t > 5 && n.push("scrollable"), e._templateListCanScrollUp && n.push("can-scroll-up"), e._templateListCanScrollDown && n.push("can-scroll-down"), n.join(" ");
}
function Ua(e) {
	let t = e.renderRoot.querySelector(".template-list");
	if (!(t instanceof HTMLElement)) {
		e._setTemplateListScrollIndicators(!1, !1);
		return;
	}
	let n = t.scrollHeight > t.clientHeight + 1, r = n && t.scrollTop > 1, i = n && t.scrollTop + t.clientHeight < t.scrollHeight - 1;
	e._setTemplateListScrollIndicators(r, i);
}
function Wa(e, t, n) {
	e._templateListCanScrollUp !== t && (e._templateListCanScrollUp = t), e._templateListCanScrollDown !== n && (e._templateListCanScrollDown = n);
}
function Ga(e, t) {
	return e._templateNameDraftKey === t.key ? e._templateNameDraft : e._templateLabel(t);
}
function Ka(e, t, n) {
	e._templateNameDraftKey = t, e._templateNameDraft = n, e._templateDirty = !0, e._saveMessage = void 0;
}
async function qa(e) {
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
async function Ja(e, t) {
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
function Ya(e, t) {
	return Un(t, e._scheduleTemplates());
}
function Xa(e) {
	e._templateApplyOpen = !e._templateApplyOpen, e._saveMessage = void 0;
}
function Za(e, t) {
	return Gn(e, t);
}
function Qa(e, t, n, r) {
	!D.includes(n) || !(e._data?.configured_entities ?? []).includes(t) || (e._templateApplyTargets = Kn(e._templateApplyTargets, t, n, r), e._saveMessage = void 0);
}
async function $a(e, t) {
	let n = e._api();
	if (!n || e._applyingTemplateTargets || e._templateApplyTargets.size === 0) return;
	let r = e._normalizeDraftBlocks("template");
	if (!r.ok) {
		e._error = r.error;
		return;
	}
	let i = qn(e._templateApplyTargets, e._data?.configured_entities ?? []);
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
function eo(e) {
	let t = e._scheduleTemplates().find((t) => t.key === e._selectedTemplateKey);
	if (!t) return !1;
	if (e._selectedEntity) {
		let n = e._unsupportedModeError(t.blocks, e._selectedEntity);
		if (n) return e._error = n, e._saveMessage = void 0, !1;
	}
	return e._draftBlocks.length && !window.confirm(e._t("confirmTemplate", {
		template: e._templateLabel(t),
		weekday: e._weekdayName(e._selectedWeekday)
	})) ? !1 : (e._draftBlocks = to(t.blocks), e._markDirty(), e._saveMessage = void 0, !0);
}
function to(e) {
	return e.map((e) => {
		let t = {
			action: e.action,
			hvac_mode: e.hvac_mode ?? "",
			start: e.start,
			temperature: e.temperature
		};
		return e.fan_mode && (t.fan_mode = e.fan_mode), e.preset_mode && (t.preset_mode = e.preset_mode), e.swing_mode && (t.swing_mode = e.swing_mode), e.swing_horizontal_mode && (t.swing_horizontal_mode = e.swing_horizontal_mode), String(e.humidity ?? "").trim() && (t.humidity = e.humidity), t;
	});
}
async function no(e, t) {
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
function ro() {
	return Wn();
}
async function io(e) {
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
function ao(e) {
	return e;
}
//#endregion
//#region src/velair/domain/schedule-compatibility.ts
var oo = 1e-4;
function so(e, t, n) {
	let r = 0;
	for (let [i, a] of Object.entries(e)) {
		let e = n(i);
		if (e === void 0 || !Number.isFinite(e) || e <= 0) continue;
		let [o, s] = t(i);
		for (let t of Object.values(a.schedule)) for (let n of t) {
			let t = n.temperature;
			if (typeof t != "number" || !Number.isFinite(t)) continue;
			let i = t < o || t > s, a = Math.abs(t / e - Math.round(t / e)) > oo;
			(i || a) && (r += 1);
		}
	}
	return r;
}
//#endregion
//#region src/velair/views/notice-view.ts
function co(e, t, n) {
	return y`
    <div class=${`notice ${t}`}>
      <span>${n}</span>
      <button class="notice-close" type="button" title=${e._t("dismiss")} @click=${() => e._dismissNotice(t)}>
        <ha-icon icon="mdi:close"></ha-icon>
      </button>
      ${t === "success" ? y`
            <div class="notice-progress-track">
              <div class="notice-progress-fill" style=${`width: ${e._successNoticeProgress()}%;`}></div>
            </div>
          ` : x}
    </div>
  `;
}
//#endregion
//#region src/velair/views/operation-status-view.ts
var lo = "velair-operation-status-dismissed", uo;
function fo(e) {
	uo = e, window.dispatchEvent(new CustomEvent(lo, { detail: e }));
}
function po(e, t, n = Date.now()) {
	return e.id === t || e.id === uo ? !1 : e.state === "completed" && e.finished_at && Number.isFinite(Date.parse(e.finished_at)) ? n - Date.parse(e.finished_at) < $e : !0;
}
function mo(e, t) {
	let n = Math.max(0, t.total), r = Math.max(0, Math.min(t.completed, n)), i = n > 0 ? Math.round(r / n * 100) : 100, a = t.state === "completed_with_errors" || t.state === "failed";
	return y`
    <section
      class=${`operation-status ${t.state}`}
      role=${a ? "alert" : "status"}
      aria-live=${a ? "assertive" : "polite"}
      aria-atomic="true"
      data-operation-id=${t.id}
    >
      <div class="operation-status-icon" aria-hidden="true">
        ${t.state === "running" ? y`<span class="operation-status-spinner"></span>` : y`<ha-icon icon=${vo(t.state)}></ha-icon>`}
      </div>
      <div class="operation-status-copy">
        <strong>${ho(e, t)}</strong>
        <span>${go(e, t, r, n)}</span>
      </div>
      <div class="operation-status-actions">
        ${n > 0 ? y`<span class="operation-status-count" aria-hidden="true">${r}/${n}</span>` : x}
        ${a ? y`
              <button
                class="operation-status-dismiss"
                type="button"
                aria-label=${e._t("operationDismiss")}
                @click=${e._dismissOperationStatus}
              >
                <ha-icon icon="mdi:close"></ha-icon>
              </button>
            ` : x}
      </div>
      ${n > 0 ? y`
            <div
              class="operation-status-progress"
              role="progressbar"
              aria-label=${e._t("operationProgressLabel")}
              aria-valuemin="0"
              aria-valuemax=${String(n)}
              aria-valuenow=${String(r)}
            >
              <span style=${`width: ${i}%`}></span>
            </div>
          ` : x}
    </section>
  `;
}
function ho(e, t) {
	let n = _o(e, t), r = t.state === "running" ? "Running" : t.state === "completed" ? "Completed" : t.state === "completed_with_errors" ? "Partial" : "Failed";
	return !t.target_id || t.target_id === "default" ? e._t(`operationDefault${r}`) : e._t(t.kind === "mode_change" ? `operationMode${r}` : `operationProfile${r}`, { target: n });
}
function go(e, t, n, r) {
	let i = [r > 0 ? e._t("operationProgress", {
		completed: n,
		total: r
	}) : e._t("operationNoZones")];
	if (t.state === "running" && t.current_entity_id && i.push(e._t("operationCurrentZone", { zone: e._friendlyEntityName(t.current_entity_id) })), t.failed_entity_ids.length > 0) {
		let n = t.failed_entity_ids.map((t) => e._friendlyEntityName(t)).join(", ");
		i.push(e._t(t.failed_entity_ids.length === 1 ? "operationFailureOne" : "operationFailureCount", {
			count: t.failed_entity_ids.length,
			zones: n
		}));
	}
	return t.state === "failed" && i.push(t.error_code === "cancelled" ? e._t("operationCancelled") : t.error_message || e._t("operationFailedHelp")), i.join(" · ");
}
function _o(e, t) {
	return t.kind === "mode_change" ? t.target_id === "default" ? e._t("modeDefault") : t.target_id === "manual" ? e._t("modeManual") : e._data?.modes?.find((e) => e.key === t.target_id)?.name ?? t.target_id ?? e._t("modeLabel") : e._data?.profiles?.find((e) => e.key === t.target_id)?.name ?? t.target_id ?? e._t("profiles");
}
function vo(e) {
	return e === "completed" ? "mdi:check-circle" : e === "completed_with_errors" ? "mdi:alert-circle" : "mdi:close-circle";
}
//#endregion
//#region src/velair/domain/comfort.ts
function yo(e, t) {
	return {
		...bo(t),
		...e
	};
}
function bo(e) {
	let t = e.toUpperCase().includes("F");
	return {
		enabled: !1,
		temperature_entity_id: null,
		humidity_enabled: !0,
		humidity_entity_id: null,
		co2_entity_id: null,
		temperature_min: t ? 68 : 20,
		temperature_max: t ? 75 : 24,
		humidity_min: 40,
		humidity_max: 60,
		co2_attention: 1e3,
		co2_poor: 1500,
		stale_after_minutes: 120
	};
}
function xo(e, t, n) {
	let r = e?.states ?? {}, i = Object.entries(r).filter(([e, r]) => {
		if (e === t) return !0;
		if (!e.startsWith("sensor.")) return !1;
		let i = String(r.attributes?.device_class ?? "").toLowerCase(), a = String(r.attributes?.unit_of_measurement ?? "").toLowerCase();
		return n === "temperature" ? i === "temperature" || a.includes("°") : n === "humidity" ? i === "humidity" || a === "%" : i === "carbon_dioxide" || a === "ppm";
	}).map(([e, t]) => ({
		entityId: e,
		label: t.attributes?.friendly_name || e
	})).sort((e, t) => e.label.localeCompare(t.label));
	return t && !i.some((e) => e.entityId === t) && i.unshift({
		entityId: t,
		label: t
	}), i;
}
function So(e) {
	return e?.availability === "current" && typeof e.value == "number" && typeof e.min == "number" && typeof e.max == "number";
}
function Co(e, t, n) {
	let r = Math.max(n - t, .1), i = t - r, a = n + r, o = (e - i) / (a - i) * 100;
	return Math.max(4, Math.min(96, o));
}
function wo(e, t, n) {
	let r = Math.min(400, t * .5), i = Math.max(n * 1.25, r + 1), a = (e - r) / (i - r) * 100;
	return Math.max(4, Math.min(96, a));
}
//#endregion
//#region src/velair/views/comfort-view.ts
var To = "__humidity_not_monitored__", Eo = {
	showConfiguration: !0,
	showTemperature: !0,
	showHumidity: !0,
	showCo2: !0
}, Do = {
	comfortTemperatureRange: "comfortTemperatureRangeHelp",
	comfortHumidityRange: "comfortHumidityRangeHelp",
	comfortCo2Limits: "comfortCo2LimitsHelp",
	comfortStaleAfter: "comfortStaleAfterHelp"
};
function Oo(e, t, n = {}) {
	let r = ko(n);
	return y`
    <section class="comfort-view">
      <header class="comfort-intro">
        <ha-icon icon="mdi:home-heart"></ha-icon>
        <span>
          <strong>${e._t("comfortIntroTitle")}</strong>
          <small>${e._t("comfortIntroDetail")}</small>
        </span>
      </header>
      ${t.length ? t.map((t) => Ao(e, t, r)) : y`<span class="empty">${e._t("noManagedEntities")}</span>`}
    </section>
  `;
}
function ko(e) {
	return {
		...Eo,
		...e
	};
}
function Ao(e, t, n) {
	let r = e._entityExists(t), i = yo(e._data?.zones[t]?.comfort, e._temperatureUnit(t)), a = e._data?.comfort?.[t], o = r && e._expandedComfortZones.has(t), s = `comfort-zone-content-${t.replace(/[^a-zA-Z0-9_-]/g, "-")}`, c = r ? e._t(o ? "comfortCollapseClimate" : "comfortExpandClimate", { climate: e._friendlyEntityName(t) }) : e._t("comfortUnavailable");
	return y`
    <section class=${`comfort-zone ${i.enabled ? "enabled" : "disabled"} ${o ? "expanded" : "collapsed"}`}>
      <header class="comfort-zone-heading" @click=${(n) => {
		let r = n.target;
		r instanceof Element && r.closest(".comfort-zone-actions") || e._toggleComfortZone(t);
	}}>
        <button
          type="button"
          class="comfort-zone-toggle"
          title=${c}
          aria-label=${c}
          aria-expanded=${String(o)}
          aria-controls=${o ? s : x}
          ?disabled=${!r}
          @click=${(n) => {
		n.preventDefault(), n.stopPropagation(), e._toggleComfortZone(t);
	}}
        >
          <ha-icon
            class="comfort-expand-icon"
            icon=${o ? "mdi:chevron-down" : "mdi:chevron-right"}
          ></ha-icon>
          <span class="comfort-zone-identity">
            <strong title=${e._friendlyEntityName(t)}>
              ${e._friendlyEntityName(t)}
            </strong>
            <span>${t}</span>
          </span>
        </button>
        <div class="comfort-zone-actions" @click=${(e) => e.stopPropagation()}>
          ${Ro(e, a)}
          <ha-switch
            .checked=${i.enabled}
            ?disabled=${e._settingsSaving || !r}
            @change=${(n) => {
		let r = !!n.target.checked;
		e._saveZoneComfort(t, { enabled: r });
	}}
          ></ha-switch>
        </div>
      </header>
      ${r && o ? y`
            <div id=${s} class="comfort-zone-content">
              ${i.enabled ? Mo(e, t, a, n) : jo(e)}
              ${n.showConfiguration ? zo(e, t, i) : x}
            </div>
          ` : x}
    </section>
  `;
}
function jo(e) {
	return y`
    <section class="comfort-assessment-card idle">
      <ha-icon icon="mdi:power-standby"></ha-icon>
      <span>${e._t("comfortDisabledDetail")}</span>
    </section>
  `;
}
function Mo(e, t, n, r = Eo) {
	return n?.enabled ? y`
    <section class="comfort-assessment-card">
      <div class="comfort-assessment-heading">
        <span>
          <ha-icon icon=${Zo(n.condition)}></ha-icon>
          <strong>${Xo(e, n)}</strong>
        </span>
        ${Yo(e, n.air_quality)}
      </div>
      ${No(e, t, n, r)}
    </section>
  ` : jo(e);
}
function No(e, t, n, r) {
	let i = r.showTemperature ? n.temperature : void 0, a = r.showHumidity ? n.humidity : void 0, o = So(i), s = So(a), c = r.showTemperature || r.showHumidity, l = r.showCo2 && Po(n.co2), u, d = !0;
	if (o && s) {
		let n = Co(i.value, i.min, i.max), r = 100 - Co(a.value, a.min, a.max), o = [
			"comfort-map-marker",
			r < 30 ? "label-below" : "",
			n < 18 ? "label-left" : "",
			n > 82 ? "label-right" : ""
		].filter(Boolean).join(" ");
		u = y`
      <div class="comfort-map">
        <div class="comfort-map-axis comfort-map-axis-y">
          <span>${e._t("comfortMoreHumid")}</span>
          <span>${e._t("comfortDrier")}</span>
        </div>
        <div
          class="comfort-map-plot"
          role="img"
          aria-label=${e._t("comfortMapCurrentPosition", {
			temperature: e._formatTemperature(i.value, t),
			humidity: `${Math.round(a.value)}%`
		})}
        >
          <span class="comfort-map-regions" aria-hidden="true">
            <span></span><span></span><span></span>
            <span></span><span></span><span></span>
            <span></span><span></span><span></span>
          </span>
          <span
            class="comfort-map-zone"
            role="img"
            aria-label=${e._t("comfortTargetZone")}
          ></span>
          <span
            class=${o}
            style=${`--comfort-x:${n}%;--comfort-y:${r}%`}
          >
            <span class="comfort-map-marker-label">
              <strong>${e._formatTemperature(i.value, t)}</strong>
              <small>${Math.round(a.value)}%</small>
            </span>
            <span class="comfort-map-marker-dot"></span>
          </span>
        </div>
        <div class="comfort-map-axis comfort-map-axis-x">
          <span>${e._t("comfortCooler")}</span>
          <span>${e._t("comfortWarmer")}</span>
        </div>
        <div class="comfort-map-legend">
          <span>
            <i class="comfort-legend-zone" aria-hidden="true"></i>
            ${e._t("comfortTargetZone")}
          </span>
          <span>
            <i class="comfort-legend-current" aria-hidden="true"></i>
            ${e._t("comfortCurrentReadings")}
          </span>
        </div>
      </div>
    `;
	} else o ? u = Fo(e, t, i, "comfortTemperature") : s ? u = Fo(e, t, a, "comfortHumidity") : c ? u = y`
      <div class="comfort-no-readings">
        <ha-icon icon=${n.data_quality === "stale" ? "mdi:clock-alert-outline" : "mdi:sensor-off"}></ha-icon>
        <span>${Xo(e, n)}</span>
      </div>
    ` : (u = x, d = !1);
	return !d && !l ? x : y`
    <div class="comfort-visuals">
      ${u}
      ${l ? Io(e, n.co2) : x}
    </div>
  `;
}
function Po(e) {
	return e?.availability === "current" && typeof e.value == "number" && typeof e.attention == "number" && typeof e.max == "number";
}
function Fo(e, t, n, r) {
	let i = Co(n.value, n.min, n.max), a = n.metric === "temperature" ? e._formatTemperature(n.value, t) : `${Math.round(n.value)}%`, o = n.metric === "temperature" ? e._formatTemperature(n.min, t) : `${Math.round(n.min)}%`, s = n.metric === "temperature" ? e._formatTemperature(n.max, t) : `${Math.round(n.max)}%`;
	return y`
    <div class=${`comfort-range-scale metric-${n.metric}`}>
      <header>
        <span>${e._t(r)}</span>
        <strong>${a}</strong>
      </header>
      <div class="comfort-scale-track">
        <span class="comfort-scale-marker" style=${`--comfort-position:${i}%`}></span>
      </div>
      <footer class="comfort-range-limits">
        <span>${o}</span>
        <span>${s}</span>
      </footer>
    </div>
  `;
}
function Io(e, t) {
	if (t?.availability !== "current" || typeof t.value != "number" || typeof t.attention != "number" || typeof t.max != "number") return x;
	let n = wo(t.value, t.attention, t.max), r = wo(t.attention, t.attention, t.max), i = wo(t.max, t.attention, t.max);
	return y`
    <div class="comfort-co2-scale">
      <header>
        <span>${e._t("comfortAirQuality")}</span>
        <strong>${Math.round(t.value)} ppm</strong>
      </header>
      <div
        class="comfort-co2-track"
        style=${`--comfort-position:${n}%;--comfort-attention:${r}%;--comfort-poor:${i}%`}
      >
        <span class="comfort-scale-marker"></span>
      </div>
      <footer>
        <span>${e._t("comfortAirQualityGood")}</span>
        <span>${e._t("comfortAirQualityElevated")}</span>
        <span>${e._t("comfortAirQualityPoor")}</span>
      </footer>
    </div>
  `;
}
function Lo(e, t) {
	if (!t?.enabled || t.data_quality === "complete") return x;
	let n = t.data_issues.length ? t.data_issues.map((t) => e._t(ts(t))).join(" · ") : e._t(es(t.data_quality));
	return y`
    <span
      class="comfort-data-warning"
      tabindex="0"
      title=${n}
      aria-label=${e._t(es(t.data_quality))}
    >
      <ha-icon icon="mdi:alert-circle-outline"></ha-icon>
      <span class="comfort-help-tooltip" role="tooltip">${n}</span>
    </span>
  `;
}
function Ro(e, t) {
	return y`
    <span class="comfort-assessment-summary">
      <span class="comfort-assessment-line">
        ${Jo(e, t)}
        ${t ? Yo(e, t.air_quality) : x}
        ${Lo(e, t)}
      </span>
    </span>
  `;
}
function zo(e, t, n) {
	let [r, i] = Bn(e._temperatureUnit(t)), a = Ho(e, t, n, "temperature_entity_id", "temperature"), o = Ho(e, t, n, "humidity_entity_id", "humidity"), s = Ho(e, t, n, "co2_entity_id", "co2");
	return y`
    <section class="comfort-config-section">
      <h3><ha-icon icon="mdi:clock-check-outline"></ha-icon>${e._t("comfortDataFreshness")}</h3>
      <div class="comfort-config-rows">
        ${Go(e, t, "comfortStaleAfter", "stale_after_minutes", n.stale_after_minutes, 5, 1440, 5, e._t("minutesShort"))}
      </div>
    </section>
    ${Bo(e, "comfortTemperature", "mdi:thermometer", Vo(e, t, n, "temperature_entity_id", "temperature", "comfortTemperatureSensor"), a ? Wo(e, t, "comfortTemperatureRange", "temperature_min", n.temperature_min, "temperature_max", n.temperature_max, r, i, .5, e._temperatureUnit(t), "comfortMinimum", "comfortMaximum") : x)}
    ${Bo(e, "comfortHumidity", "mdi:water-percent", Vo(e, t, n, "humidity_entity_id", "humidity", "comfortHumiditySensor"), o ? Wo(e, t, "comfortHumidityRange", "humidity_min", n.humidity_min, "humidity_max", n.humidity_max, 0, 100, 1, "%", "comfortMinimum", "comfortMaximum") : x)}
    ${Bo(e, "comfortCo2", "mdi:molecule-co2", Vo(e, t, n, "co2_entity_id", "co2", "comfortCo2Sensor"), s ? Wo(e, t, "comfortCo2Limits", "co2_attention", n.co2_attention, "co2_poor", n.co2_poor, 400, 1e4, 50, "ppm", "comfortCo2Attention", "comfortCo2Poor") : x)}
  `;
}
function Bo(e, t, n, r, i) {
	return y`
    <section class="comfort-config-section comfort-metric-config-section">
      <h3><ha-icon icon=${n}></ha-icon>${e._t(t)}</h3>
      <div class="comfort-config-rows">
        ${r}
        ${i}
      </div>
    </section>
  `;
}
function Vo(e, t, n, r, i, a) {
	let o = n[r] ?? "", s = i === "humidity" && !n.humidity_enabled ? To : o, c = xo(e.hass, o, i), l = Uo(e, t, n, r, i), u = i === "co2" ? "comfortDoNotMonitor" : "comfortSelectSensor";
	return y`
    <label class="comfort-config-row comfort-picker-row">
      ${qo(e, a)}
      <span class="select-wrap comfort-select-wrap">
        <span class="comfort-select-control">
          <select
          .value=${s}
          value=${s}
          ?disabled=${e._settingsSaving}
          @change=${(n) => {
		let a = n.currentTarget.value.trim();
		if (i === "humidity") {
			if (a === To) {
				e._saveZoneComfort(t, { humidity_enabled: !1 });
				return;
			}
			e._saveZoneComfort(t, {
				humidity_enabled: !0,
				[r]: a || null
			});
			return;
		}
		e._saveZoneComfort(t, { [r]: a || null });
	}}
        >
          <option value="" ?selected=${s === ""}>
            ${e._t(u)}
          </option>
          ${i === "humidity" ? y`
                <option
                  value=${To}
                  ?selected=${s === To}
                >
                  ${e._t("comfortDoNotMonitorHumidity")}
                </option>
              ` : x}
          ${c.map((e) => y`
              <option value=${e.entityId} ?selected=${e.entityId === s}>
                ${e.label} · ${e.entityId}
              </option>
            `)}
          </select>
        </span>
        <small class="comfort-selected-entity" title=${l}>${l}</small>
      </span>
    </label>
  `;
}
function Ho(e, t, n, r, i) {
	if (i === "humidity" && !n.humidity_enabled) return !1;
	if (n[r]?.trim() || i === "temperature") return !0;
	if (i === "humidity") {
		let n = e.hass?.states?.[t]?.attributes;
		return !!(n && ("current_humidity" in n || "humidity" in n));
	}
	return !1;
}
function Uo(e, t, n, r, i) {
	if (i === "humidity" && !n.humidity_enabled) return e._t("comfortNotMonitored");
	let a = n[r]?.trim();
	if (a) return a;
	if (i === "temperature") {
		let n = e._data?.zones[t]?.preconditioning?.room_temperature_entity_id;
		return e._t("comfortAutomaticSourceValue", { entity: n || t });
	}
	if (i === "humidity") {
		let n = e.hass?.states?.[t]?.attributes;
		if (n && ("current_humidity" in n || "humidity" in n)) return e._t("comfortAutomaticSourceValue", { entity: t });
	}
	return e._t("comfortNotMonitored");
}
function Wo(e, t, n, r, i, a, o, s, c, l, u, d, f) {
	return y`
    <label class="comfort-config-row comfort-threshold-row">
      ${qo(e, n)}
      <span class="comfort-number-pair">
        <span class="comfort-number-field">
          <small>${e._t(d)}</small>
          ${Ko(e, t, r, i, s, c, l)}
        </span>
        <span class="comfort-number-separator">–</span>
        <span class="comfort-number-field">
          <small>${e._t(f)}</small>
          ${Ko(e, t, a, o, s, c, l)}
        </span>
        <span class="comfort-number-unit">${u}</span>
      </span>
    </label>
  `;
}
function Go(e, t, n, r, i, a, o, s, c) {
	return y`
    <label class="comfort-config-row">
      ${qo(e, n)}
      <span class="comfort-number-single">
        <span class="comfort-number-field comfort-number-field-single">
          <small aria-hidden="true">&nbsp;</small>
          ${Ko(e, t, r, i, a, o, s)}
        </span>
        <span class="comfort-number-single-unit">${c}</span>
      </span>
    </label>
  `;
}
function Ko(e, t, n, r, i, a, o) {
	return y`
    <input
      type="number"
      min=${String(i)}
      max=${String(a)}
      step=${String(o)}
      .value=${String(r)}
      ?disabled=${e._settingsSaving}
      @change=${(o) => {
		let s = Number(o.currentTarget.value), c = Math.min(a, Math.max(i, Number.isFinite(s) ? s : r));
		e._saveZoneComfort(t, { [n]: c });
	}}
    />
  `;
}
function qo(e, t) {
	let n = Do[t], r = n ? e._t(n) : "";
	return y`
    <span class="label comfort-config-label">
      <span>${e._t(t)}</span>
      ${n ? y`
            <span class="comfort-help" tabindex="0" aria-label=${r}>
              <ha-icon icon="mdi:information-outline"></ha-icon>
              <span class="comfort-help-tooltip" role="tooltip">${r}</span>
            </span>
          ` : x}
    </span>
  `;
}
function Jo(e, t) {
	return y`
    <span class=${`comfort-condition-pill condition-${t?.condition ?? "monitoring_off"}`}>
      ${t ? Xo(e, t) : e._t("comfortConditionMonitoringOff")}
    </span>
  `;
}
function Yo(e, t) {
	return t === "not_monitored" ? x : y`
    <span class=${`comfort-air-pill air-${t}`}>
      ${e._t($o(t))}
    </span>
  `;
}
function Xo(e, t) {
	return t.condition === "no_readings" && t.data_quality === "stale" ? e._t("comfortConditionReadingsOutdated") : e._t(Qo(t.condition));
}
function Zo(e) {
	return {
		cold: "mdi:snowflake-thermometer",
		cold_and_dry: "mdi:snowflake",
		cold_and_humid: "mdi:weather-snowy-rainy",
		comfortable: "mdi:check-circle-outline",
		dry: "mdi:water-off-outline",
		hot: "mdi:sun-thermometer-outline",
		hot_and_dry: "mdi:weather-sunny-alert",
		hot_and_humid: "mdi:weather-partly-rainy",
		humid: "mdi:water-percent",
		humidity_comfortable: "mdi:water-check-outline",
		monitoring_off: "mdi:power-standby",
		no_readings: "mdi:sensor-off",
		temperature_comfortable: "mdi:thermometer-check"
	}[e];
}
function Qo(e) {
	return {
		cold: "comfortConditionCold",
		cold_and_dry: "comfortConditionColdAndDry",
		cold_and_humid: "comfortConditionColdAndHumid",
		comfortable: "comfortConditionComfortable",
		dry: "comfortConditionDry",
		hot: "comfortConditionHot",
		hot_and_dry: "comfortConditionHotAndDry",
		hot_and_humid: "comfortConditionHotAndHumid",
		humid: "comfortConditionHumid",
		humidity_comfortable: "comfortConditionHumidityComfortable",
		monitoring_off: "comfortConditionMonitoringOff",
		no_readings: "comfortConditionNoReadings",
		temperature_comfortable: "comfortConditionTemperatureComfortable"
	}[e];
}
function $o(e) {
	return {
		elevated: "comfortAirQualityElevated",
		good: "comfortAirQualityGood",
		poor: "comfortAirQualityPoor",
		unavailable: "comfortAirQualityUnavailable"
	}[e];
}
function es(e) {
	return {
		partial: "comfortDataPartial",
		stale: "comfortDataStale",
		unavailable: "comfortDataUnavailable"
	}[e];
}
function ts(e) {
	return {
		co2_missing: "comfortDataIssueCo2Missing",
		co2_stale: "comfortDataIssueCo2Stale",
		humidity_missing: "comfortDataIssueHumidityMissing",
		humidity_stale: "comfortDataIssueHumidityStale",
		temperature_missing: "comfortDataIssueTemperatureMissing",
		temperature_stale: "comfortDataIssueTemperatureStale"
	}[e] ?? "comfortDataUnavailable";
}
//#endregion
//#region src/velair/domain/climate-profiles.ts
function H(e) {
	if (!e) return {
		name: "",
		icon: "mdi:account-outline",
		description: "",
		zones: {},
		rememberedSchedules: {}
	};
	let t = Object.fromEntries(Object.entries(e.zones).map(([e, t]) => [e, t.behavior === "schedule" ? {
		behavior: "schedule",
		schedule: Object.fromEntries(D.map((e) => [e, Or(t.schedule[e] ?? [])]))
	} : structuredClone(t)]));
	return {
		...structuredClone(e),
		color: e.color || U(e.key),
		zones: t,
		rememberedSchedules: Object.fromEntries(Object.entries(t).filter(([, e]) => e.behavior === "schedule").map(([e, t]) => [e, cs(t.schedule)]))
	};
}
function ns(e) {
	let t = new Map((e?.profiles ?? []).map((e) => [e.key, e]));
	return (e?.global?.active_profile_ids ?? []).map((e) => t.get(e)).filter((e) => !!e);
}
function rs(e, t) {
	let n = ns(e).find((e) => t in e.zones), r = n?.zones[t];
	if (!(!n || !r || r.behavior === "normal")) return {
		profile: n,
		zone: r
	};
}
function is(e, t) {
	let n = rs(e, t);
	if (n?.zone.behavior !== "pause") return n?.zone.behavior === "schedule" ? n.zone.schedule : e?.zones[t]?.schedule;
}
var as = [
	"#3949ab",
	"#00897b",
	"#7b1fa2",
	"#d84315",
	"#00838f",
	"#c2185b",
	"#5d4037",
	"#2e7d32"
];
function U(e, t) {
	if (t && /^#[0-9a-f]{6}$/i.test(t)) return t;
	if (!e) return "#546e7a";
	let n = 0;
	for (let t of e) n = (n << 5) - n + t.charCodeAt(0) | 0;
	return as[Math.abs(n) % as.length];
}
function os(e) {
	return e?.behavior ?? "normal";
}
function ss(e, t, n) {
	let r = { ...e.zones }, i = { ...e.rememberedSchedules }, a = r[t];
	return a?.behavior === "schedule" && (i[t] = cs(a.schedule)), n === "normal" ? delete r[t] : n === "schedule" ? r[t] = {
		behavior: n,
		schedule: cs(a?.behavior === "schedule" ? a.schedule : i[t])
	} : r[t] = {
		behavior: n,
		action: "none"
	}, {
		...e,
		zones: r,
		rememberedSchedules: i
	};
}
function cs(e) {
	return Object.fromEntries(D.map((t) => [t, structuredClone(e?.[t] ?? [])]));
}
function ls(e, t, n) {
	let r = cs(e);
	for (let i of n) i !== t && i in r && (r[i] = structuredClone(e[t] ?? []));
	return r;
}
function us(e) {
	let t = new Set(e.map((e) => e.start)), n = [
		"08:00",
		"18:00",
		"22:00",
		"12:00",
		"06:00",
		"16:00",
		"20:00"
	].find((e) => !t.has(e));
	if (n) return n;
	for (let e = 0; e < 1440; e += 30) {
		let n = `${String(Math.floor(e / 60)).padStart(2, "0")}:${String(e % 60).padStart(2, "0")}`;
		if (!t.has(n)) return n;
	}
	return "00:00";
}
function ds(e, t) {
	let n = new Set(t.map((e) => e.name));
	if (!n.has(e)) return e;
	let r = 2;
	for (; n.has(`${e} ${r}`);) r += 1;
	return `${e} ${r}`;
}
function fs(e) {
	if (!e.name.trim()) return "name";
	if (e.icon?.trim() && !/^mdi:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e.icon.trim())) return "icon";
	if (e.color && !/^#[0-9a-f]{6}$/i.test(e.color)) return "color";
	if ((e.description?.trim().length ?? 0) > 500) return "description";
	for (let t of Object.values(e.zones)) if (t.behavior === "schedule") for (let e of D) {
		let n = /* @__PURE__ */ new Set();
		for (let r of t.schedule[e] ?? []) if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.start) || n.has(r.start) || (n.add(r.start), r.action !== "turn_off" && !Number.isFinite(Number(r.temperature)))) return "schedule";
	}
}
function ps(e) {
	let t = Object.fromEntries(Object.entries(e.zones).filter(([, e]) => e.behavior !== "normal").map(([e, t]) => [e, t.behavior === "schedule" ? {
		behavior: "schedule",
		schedule: Object.fromEntries(D.map((e) => [e, (t.schedule[e] ?? []).map(ms)]))
	} : t]));
	return {
		...e.key ? { key: e.key } : {},
		name: e.name.trim(),
		...e.icon?.trim() ? { icon: e.icon.trim() } : {},
		...e.color ? { color: e.color.toLowerCase() } : {},
		...e.description?.trim() ? { description: e.description.trim() } : {},
		zones: t
	};
}
function ms(e) {
	return (e.action || "set_temperature") === "turn_off" ? {
		start: e.start,
		action: Xe
	} : {
		start: e.start,
		action: Ye,
		temperature: Number(e.temperature),
		...e.hvac_mode ? { hvac_mode: e.hvac_mode } : {},
		...e.fan_mode ? { fan_mode: e.fan_mode } : {},
		...e.preset_mode ? { preset_mode: e.preset_mode } : {},
		...e.swing_mode ? { swing_mode: e.swing_mode } : {},
		...e.swing_horizontal_mode ? { swing_horizontal_mode: e.swing_horizontal_mode } : {},
		...String(e.humidity ?? "").trim() ? { humidity: Number(e.humidity) } : {}
	};
}
//#endregion
//#region src/velair/controllers/overview-data.ts
var hs = new Set([
	"heating",
	"cooling",
	"drying",
	"fan",
	"idle",
	"off",
	"preheating",
	"defrosting"
]);
function W(e) {
	return e;
}
function gs(e, t, n) {
	let r = n?.override ?? e._data?.active_overrides?.[t];
	return Jn(r) ? r : void 0;
}
function _s(e) {
	return e._data ? e._orderedZoneIds(e._data.configured_entities).filter((t) => {
		let n = e._data?.zones[t];
		return !!gs(e, t, n);
	}) : [];
}
function vs(e, t, n) {
	return Yn(n?.override) ? n?.override ?? void 0 : void 0;
}
function ys(e, t, n) {
	let r = Number(n.temperature), i = M(n.until), a = typeof n.hvac_mode == "string" ? n.hvac_mode : "", o = [];
	return Number.isFinite(r) && o.push(e._formatTemperature(r, t)), a && o.push(e._modeLabel(a)), i && o.push(`${e._t("boostUntil")}: ${e._formatRemaining(Math.max(0, i - Date.now()))}`), o.join(" - ") || e._t("boostActive");
}
function bs(e, t) {
	let n = M(t.started_at), r = M(t.until), i = [];
	return n && i.push(`${e._t("pauseFrom")}: ${e._formatDateTime(new Date(n).toISOString())}`), r ? (i.push(`${e._t("pauseTo")}: ${e._formatDateTime(new Date(r).toISOString())}`), i.push(`${e._t("pauseRemaining")}: ${e._formatRemaining(Math.max(0, r - Date.now()))}`), i.join(" - ")) : (i.push(e._t("pauseIndefinite")), i.join(" - "));
}
function xs(e) {
	if (!e._data) return [];
	if (e._data.next_events.length) return e._data.next_events;
	let t = e._orderedZoneIds(e._data.configured_entities).map((t) => Ss(e, t, e._data?.zones[t])).filter((e) => !!e).sort((e, t) => new Date(e.when).getTime() - new Date(t.when).getTime());
	return t.length ? t : e._data.next_events;
}
function Ss(e, t, n) {
	let r = is(e._data, t);
	if (!(!n || !r)) return Dn(t, {
		...n,
		schedule: r
	}, gs(e, t, n));
}
function Cs() {
	return Mn(/* @__PURE__ */ new Date());
}
function ws(e, t) {
	let n = e.hass?.states?.[t]?.attributes?.hvac_action;
	return typeof n == "string" && hs.has(n) ? n : void 0;
}
//#endregion
//#region src/velair/domain/room-assist.ts
function Ts(e, t) {
	return t === "cool" ? -Math.abs(e) : Math.abs(e);
}
//#endregion
//#region src/velair/views/overview-view.ts
function Es(e) {
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
function Ds(e, t) {
	if (!e._data) return x;
	let n = Es(e);
	return y`
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
          ${lc(e)}
          <span class="overview-scheduler-detail">${n.detail}</span>
        </div>
        ${uc(e)}
      </div>
    </section>
  `;
}
function Os(e, t) {
	if (!e._data) return x;
	let n = W(e), r = t ? new Set(t) : void 0, i = _s(n).filter((e) => !r || r.has(e));
	return y`
    <section class="overview-boost-panel">
      ${i.length ? y`
            ${ac(e._t("activeBoosts"), "mdi:lightning-bolt")}
            <div class="event-list overview-boost-list">
              ${i.map((t) => {
		let r = gs(n, t, e._data?.zones[t]);
		return y`
                  <div class="event">
                    <div>
                      <strong class="overview-climate-name">${e._friendlyEntityName(t)}</strong>
                    </div>
                    ${r ? ks(e, t, r) : y`<span>${e._t("boostActive")}</span>`}
                  </div>
                `;
	})}
            </div>
          ` : cc(e._t("activeBoosts"), "mdi:lightning-bolt", e._t("noActiveBoosts"))}
    </section>
  `;
}
function ks(e, t, n) {
	let r = Number(n.temperature), i = typeof n.until == "string" ? new Date(n.until).getTime() : void 0, a = typeof n.hvac_mode == "string" ? n.hvac_mode : "";
	return y`
    <div class="event-details">
      <span class="event-time">${i && !Number.isNaN(i) ? `${e._formatDateTime(new Date(i).toISOString())} (${e._formatRemaining(Math.max(0, i - Date.now()))})` : e._t("boostActive")}</span>
      <strong class="event-target">${Number.isFinite(r) ? e._formatTemperature(r, t) : "-"}</strong>
      <span class="event-mode">${a ? e._modeLabel(a) : e._t("keepMode")}</span>
    </div>
  `;
}
function As(e, t) {
	return !e._data || !t.length ? x : y`
    <section class="overview-zones">
      ${ac(e._t("overviewZones"), "mdi:thermostat")}
      <div class="overview-zone-cards">
        ${t.map((t) => Ms(e, t))}
      </div>
    </section>
  `;
}
var js = {
	stopped: {
		icon: "mdi:stop-circle-outline",
		key: "overviewZoneAutomationOff"
	},
	paused: {
		icon: "mdi:pause-circle",
		key: "overviewZonePaused"
	},
	boost: {
		icon: "mdi:lightning-bolt",
		key: "overviewZoneBoost"
	},
	preconditioning: {
		icon: "mdi:clock-fast",
		key: "overviewZonePreconditioning"
	},
	scheduled: {
		icon: "mdi:calendar-clock",
		key: "overviewZoneScheduled"
	},
	idle: {
		icon: "mdi:hand-back-right-outline",
		key: "overviewZoneManual"
	}
};
function Ms(e, t) {
	let n = e._data?.zone_runtime?.[t], r = n != null, i = n ?? { state: "idle" }, a = e.hass?.states?.[t], o = a && a.state !== "off" && a.state !== "unknown" && a.state !== "unavailable", s = G(i.room_temperature) ?? (r ? void 0 : G(a?.attributes?.current_temperature)), c = G(i.target_temperature) ?? (!r && o ? G(a.attributes?.temperature) : void 0), l = G(i.applied_temperature), u = js[i.state], d = e._data?.room_sensor_assist?.[t], f = e._data?.comfort?.[t], p = !!(d && (d.status === "assisting" || d.status === "holding") && Fs(d)), ee = s !== void 0 || c !== void 0 || l !== void 0 && c !== void 0 && Math.abs(l - c) >= .05;
	return y`
    <article class=${`overview-zone-card state-${i.state}`}>
      <div class="overview-zone-card-heading">
        <div class="overview-zone-card-name">
          <strong>${e._friendlyEntityName(t)}</strong><span>${t}</span>
        </div>
        <div class="overview-zone-signals">
          ${Ns(e, t)}
          ${Bs(e, d)}
          ${Us(e, f)}
        </div>
        ${Ps(e, t, i, u)}
      </div>
      ${p || ee ? y`<div class="overview-zone-details">
        ${p ? Is(e, t, d) : y`<div class="overview-zone-metrics">
          ${s === void 0 ? x : Hs(e._t("overviewZoneRoom"), s, e, t)}
          ${c === void 0 ? x : Hs(e._t("overviewZoneTarget"), c, e, t)}
          ${l !== void 0 && c !== void 0 && Math.abs(l - c) >= .05 ? Hs(e._t("overviewZoneApplied"), l, e, t) : x}
        </div>`}
      </div>` : x}
    </article>`;
}
function Ns(e, t) {
	let n = rs(e._data, t);
	if (!n) return x;
	let r = U(n.profile.key, n.profile.color), i = n.profile.icon || "mdi:account-outline";
	return y`
    <div
      class="overview-zone-profile"
      style=${`--overview-profile-accent: ${r}`}
      title=${`${e._t("profileOverviewLabel")}: ${n.profile.name}`}
    >
      <span class="overview-zone-profile-accent">
        <ha-icon icon=${i}></ha-icon>
        <small>${e._t("profileOverviewLabel")}</small>
      </span>
      <strong>${n.profile.name}</strong>
    </div>
  `;
}
function Ps(e, t, n, r) {
	let i = "";
	if (n.state === "paused" && (i = n.until ? e._t("overviewZoneResumes", { time: e._formatDateTime(n.until) }) : e._t("overviewZoneUntilResumed")), n.state === "boost" && n.until && (i = e._t("overviewZoneUntil", { time: e._formatDateTime(n.until) })), n.state === "preconditioning" && n.target_when && (i = e._t("overviewZoneReadyAt", { time: e._formatDateTime(n.target_when) })), n.state === "scheduled") {
		let n = e._data?.next_events?.find((e) => e.entity_id === t);
		i = n?.when ? e._t("overviewZoneNextAt", { time: e._formatDateTime(n.when) }) : "";
	}
	let a = e._t(r.key), o = ws(W(e), t), s = o ? Vs[o] : void 0, c = o === "idle" ? r.icon : s?.icon ?? r.icon, l = o ? W(e)._hvacActionLabel(o) : a, u = [...o ? [a] : [], ...n.hvac_mode ? [e._modeLabel(n.hvac_mode)] : []].join(" · "), d = [
		l,
		u,
		i
	].filter(Boolean), f = o ? ` action-${o}${s?.styleAction ? ` action-${s.styleAction}` : ""}` : "";
	return y`<section
    class=${`overview-zone-activity state-${n.state}${f}`}
    aria-label=${d.join(". ")}
    title=${d.join(" · ")}
  >
    <span class="overview-zone-activity-icon"><ha-icon icon=${c}></ha-icon></span>
    <span class="overview-zone-activity-copy">
      <span class="overview-zone-activity-summary">
        <strong>${l}</strong>
        ${u ? y`
          <span class="overview-zone-activity-separator" aria-hidden="true">·</span>
          <span class="overview-zone-activity-context">${u}</span>
        ` : x}
      </span>
      ${i ? y`<small class="overview-zone-activity-detail">${i}</small>` : x}
    </span>
  </section>`;
}
function Fs(e) {
	return [
		e.room_temperature,
		e.climate_temperature,
		e.target_temperature,
		e.climate_target_temperature,
		e.applied_temperature,
		e.assist_delta
	].some((e) => G(e) !== void 0);
}
function Is(e, t, n) {
	let r = n.status === "assisting" || n.status === "holding" ? G(n.applied_temperature) ?? G(n.climate_target_temperature) : G(n.climate_target_temperature) ?? G(n.applied_temperature), i = G(n.assist_delta);
	return y`<div class="overview-assist-flow" aria-label=${e._t("overviewZoneRoomAssistThermalFlow")}>
    ${Ls(e._t("overviewZoneTemperature"), [Rs(e, t, "overviewZoneClimate", n.climate_temperature), Rs(e, t, "overviewZoneSensor", n.room_temperature)])}
    ${Ls(e._t("overviewZoneSetpoint"), [Rs(e, t, "overviewZoneClimate", r), Rs(e, t, "overviewZoneScheduledSetpoint", n.target_temperature)])}
    ${i === void 0 ? x : y`<span class="overview-assist-offset"><small>${e._t("overviewZoneOffset")}</small><strong>${zs(e, t, Ts(i, n.direction))}</strong></span>`}
  </div>`;
}
function Ls(e, t) {
	let n = t.filter((e) => e !== x);
	return n.length ? y`<section class="overview-assist-group"><small>${e}</small><div>${n}</div></section>` : x;
}
function Rs(e, t, n, r) {
	let i = G(r);
	return i === void 0 ? x : y`<span class="overview-assist-metric"><small>${e._t(n)}</small><strong>${e._formatTemperature(i, t)}</strong></span>`;
}
function zs(e, t, n) {
	let r = e._formatTemperature(Math.abs(n), t);
	return n > 0 ? `+${r}` : n < 0 ? `-${r}` : r;
}
function Bs(e, t) {
	if (!t || !["assisting", "holding"].includes(t.status)) return x;
	let n = e._t(t.status === "holding" ? "overviewZoneRoomAssistHolding" : "overviewZoneRoomAssistActive");
	return Ws("room-assist", "mdi:thermometer-auto", e._t("roomSensorAssistBadge"), n);
}
var Vs = {
	heating: { icon: "mdi:fire" },
	cooling: { icon: "mdi:snowflake" },
	drying: { icon: "mdi:water-percent" },
	fan: { icon: "mdi:fan" },
	idle: { icon: "mdi:pause-circle-outline" },
	off: { icon: "mdi:power" },
	preheating: {
		icon: "mdi:radiator",
		styleAction: "heating"
	},
	defrosting: {
		icon: "mdi:snowflake-melt",
		styleAction: "drying"
	}
};
function G(e) {
	return typeof e == "number" && Number.isFinite(e) ? e : void 0;
}
function Hs(e, t, n, r) {
	return y`<span class="overview-zone-metric"><small>${e}</small><strong>${n._formatTemperature(t, r)}</strong></span>`;
}
function Us(e, t) {
	if (!t?.enabled) return x;
	let n = t.data_quality !== "complete" && t.condition !== "no_readings", r = {
		comfortable: "comfortConditionComfortable",
		temperature_comfortable: "comfortConditionTemperatureComfortable",
		humidity_comfortable: "comfortConditionHumidityComfortable",
		cold: "comfortConditionCold",
		hot: "comfortConditionHot",
		dry: "comfortConditionDry",
		humid: "comfortConditionHumid",
		cold_and_dry: "comfortConditionColdAndDry",
		cold_and_humid: "comfortConditionColdAndHumid",
		hot_and_dry: "comfortConditionHotAndDry",
		hot_and_humid: "comfortConditionHotAndHumid",
		no_readings: "comfortConditionNoReadings"
	}, i = {
		good: "comfortAirQualityGood",
		elevated: "comfortAirQualityElevated",
		poor: "comfortAirQualityPoor",
		unavailable: "comfortAirQualityUnavailable"
	}, a = ![
		"comfortable",
		"temperature_comfortable",
		"humidity_comfortable"
	].includes(t.condition), o = t.condition === "no_readings" ? "error" : a ? "warning" : "normal", s = t.air_quality === "poor" ? "error" : t.air_quality === "elevated" || t.air_quality === "unavailable" ? "warning" : "normal";
	return y`
    ${Ws("comfort-environment", "mdi:home-thermometer-outline", e._t("overviewZoneComfortLabel"), e._t(r[t.condition] ?? "comfortConditionNoReadings"), o)}
    ${t.air_quality === "not_monitored" ? x : Ws("comfort-air", "mdi:molecule-co2", e._t("overviewZoneAirLabel"), e._t(i[t.air_quality]), s)}
    ${n ? Ws("comfort-data", "mdi:alert-circle-outline", e._t("overviewZoneDataLabel"), e._t("overviewZoneSensorIssue"), "warning") : x}
  `;
}
function Ws(e, t, n, r, i = "normal") {
	return y`<span class=${`overview-zone-signal ${e} ${i}`} aria-label=${`${n}: ${r}`} title=${`${n}: ${r}`}><ha-icon icon=${t}></ha-icon><span><small>${n}:</small><strong>${r}</strong></span></span>`;
}
function Gs(e, t) {
	if (!e._data || !t.length) return x;
	let n = Zn(e._currentTimelineNow()), r = Cs();
	return y`
    <section class="overview-timeline-panel">
      ${ac(e._t("todayTimeline"), "mdi:timeline-clock-outline")}
      <div class="overview-timeline-scroll">
        <div class="overview-timeline-layout">
          <div class="overview-timeline-names">
            <div class="overview-timeline-axis-spacer"></div>
            ${t.map((t) => qs(e, t))}
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
            ${t.map((t) => Ks(e, t, is(e._data, t)?.[r] ?? []))}
          </div>
        </div>
      </div>
    </section>
  `;
}
function Ks(e, t, n) {
	let r = er(n), i = W(e), a = e._data?.zones[t], o = gs(i, t, e._data?.zones[t]), s = vs(i, t, a) ?? Js(e), c = o ? tr(o, e._currentTimelineNow()) : void 0, l = s ? nr(s, e._currentTimelineNow()) : void 0;
	return y`
    <div class=${l?.indefinite ? "overview-timeline-track paused-indefinite" : "overview-timeline-track"}>
      ${r.length || c || l ? r.map((n) => Ys(e, t, n)) : y`<span class="overview-timeline-empty">${e._t("noBlocks")}</span>`}
      ${c && o ? Xs(e, t, c, o) : x}
      ${l && s ? Zs(e, t, l, s) : x}
      ${e._overviewTimelineDetail && e._overviewTimelineDetailEntityId === t ? y`
            <div
              class=${`overview-timeline-tap-detail ${rc(e._overviewTimelineDetailAnchor ?? 50)}`}
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
          ` : x}
    </div>
  `;
}
function qs(e, t) {
	let n = W(e), r = e._data?.zones[t], i = gs(n, t, r), a = vs(n, t, r) ?? Js(e), o = rs(e._data, t), s = !!(o && !i && !a), c = e._friendlyEntityName(t), l = a ? bs(n, a) : "", u = o ? `${e._t("profileOverviewLabel")}: ${o.profile.name}` : "", d = a ? `${c} - ${e._t("pauseActive")} - ${l}` : s ? `${c} - ${u}` : c;
	return y`
    <div
      class=${a ? "overview-timeline-name paused" : s ? "overview-timeline-name profiled" : "overview-timeline-name"}
      style=${s && o ? `--overview-profile-accent: ${U(o.profile.key, o.profile.color)}` : ""}
      title=${d}
    >
      ${a ? y`<ha-icon icon="mdi:pause-circle" aria-hidden="true"></ha-icon>` : x}
      ${s && o ? y`<ha-icon icon=${o.profile.icon || "mdi:account-outline"} aria-hidden="true"></ha-icon>` : x}
      <span class="overview-climate-name">${c}</span>
    </div>
  `;
}
function Js(e) {
	if (e._data?.global?.mode === "paused") return {
		type: "pause",
		started_at: e._data.global.paused_started_at,
		until: e._data.global.paused_until
	};
}
function Ys(e, t, n) {
	let r = ec(e, t, n.block), i = Qs(e, t, n.block), a = $s(e, t, n.block);
	return y`
    <button
      class=${[
		"overview-timeline-block",
		`mode-${or(n.block)}`,
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
        ${a ? y`<small>${a}</small>` : x}
      </span>
    </button>
  `;
}
function Xs(e, t, n, r) {
	let i = or({ hvac_mode: n.block.hvac_mode ?? e.hass?.states?.[t]?.state }), a = `${e._t("boostActive")} - ${e._formatScheduleTime(n.block.start)} - ${e._formatScheduleTime(nc(n.endMinute))} - ${ys(W(e), t, r)}`;
	return y`
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
        ${Number.isFinite(n.block.temperature) ? y`<span>${e._formatTemperature(Number(n.block.temperature), t)}</span>` : x}
      </span>
    </button>
  `;
}
function Zs(e, t, n, r) {
	let i = `${e._t("pauseActive")} - ${bs(W(e), r)}`;
	return y`
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
function Qs(e, t, n) {
	return e._formatEventAction(tc(t, n));
}
function $s(e, t, n) {
	return n.action === "turn_off" || n.hvac_mode === "off" ? "" : e._formatEventMode(tc(t, n));
}
function ec(e, t, n) {
	let r = Qs(e, t, n), i = $s(e, t, n);
	return [
		e._formatScheduleTime(n.start),
		r,
		i
	].filter(Boolean).join(" - ");
}
function tc(e, t) {
	return {
		action: t.action,
		entity_id: e,
		hvac_mode: t.hvac_mode ?? null,
		start: t.start,
		temperature: t.temperature ?? null,
		weekday: Cs(),
		when: (/* @__PURE__ */ new Date()).toISOString()
	};
}
function nc(e) {
	let t = Math.max(0, Math.min(1440, e)), n = Math.floor(t / 60), r = t % 60;
	return `${String(n).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
function rc(e) {
	return e >= 72 ? "align-end" : e <= 28 ? "align-start" : "align-center";
}
function ic(e, t) {
	let n = t ? new Set(t) : void 0, r = xs(W(e)).filter((e) => !n || n.has(e.entity_id)), i = r.some((e) => e.target_when && e.target_when !== e.when);
	return r.length ? y`
    <section class="next">
      ${ac(e._t(r.length === 1 ? "nextEvent" : "nextEvents"), "mdi:calendar-clock")}
      <div class=${`event-list ${i ? "has-preconditioning" : ""}`}>
        ${r.map((t) => oc(e, t))}
      </div>
    </section>
  ` : y`
      <section class="next">
        ${cc(e._t("nextEvent"), "mdi:calendar-clock", e._t("noUpcomingEvent"))}
      </section>
    `;
}
function ac(e, t) {
	return y`
    <div class="overview-section-title section-heading">
      <ha-icon icon=${t}></ha-icon>
      <span class="section-label">${e}</span>
    </div>
  `;
}
function oc(e, t) {
	return y`
    <div class="event">
      <div class="event-identity">
        <strong class="overview-climate-name">${e._friendlyEntityName(t.entity_id)}</strong>
      </div>
      ${sc(e, t)}
    </div>
  `;
}
function sc(e, t) {
	let n = !!(t.target_when && t.target_when !== t.when), r = e._changedNextEventIds?.has(t.entity_id) ? `next-event-updated update-${e._nextEventChangeRevision % 2 == 0 ? "even" : "odd"}` : "";
	return y`
    <div class=${`event-details ${n ? "preconditioned" : ""}`}>
      ${n ? y`
            <span class="event-time event-time-sequence">
              <span class=${`event-time-flow ${r}`}>
                <ha-icon
                  class="preconditioning-icon"
                  icon="mdi:clock-fast"
                  title=${e._t("preconditioning")}
                  aria-label=${e._t("preconditioning")}
                ></ha-icon>
                <span class="preconditioning-start">${e._formatDateTime(t.when)}</span>
                <ha-icon
                  class="preconditioning-arrow"
                  icon="mdi:arrow-left"
                  aria-hidden="true"
                ></ha-icon>
                <span class="target-time">${e._formatDateTime(String(t.target_when))}</span>
              </span>
            </span>
          ` : y`
            <span class="event-time">
              <span class=${`event-time-flow event-time-single ${r}`}><span class="target-time">${e._formatDateTime(t.when)}</span></span>
            </span>
          `}
      <strong class="event-target">${e._formatEventAction(t)}</strong>
      <span class="event-mode">${e._formatEventMode(t)}</span>
    </div>
  `;
}
function cc(e, t, n) {
	return y`
    <div class="overview-empty-state">
      <ha-icon icon=${t}></ha-icon>
      <div class="overview-empty-copy">
        <span class="section-label">${e}</span>
        <span class="overview-muted">${n}</span>
      </div>
    </div>
  `;
}
function lc(e) {
	let t = e._canResumeScheduler();
	return y`
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
function uc(e) {
	let t = e._pauseExpirationMs();
	if (!t || t <= Date.now()) return x;
	let n = Math.max(0, t - Date.now()), r = e._pauseProgressPercent(t);
	return y`
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
//#region src/velair/domain/preconditioning.ts
function dc(e, t) {
	let n = e?.config?.unit_system?.temperature, r = e?.states ?? {}, i = Object.entries(r).filter(([e, r]) => {
		if (!e.startsWith("sensor.")) return !1;
		let i = r.attributes ?? {};
		return i.device_class === "temperature" || n !== void 0 && i.unit_of_measurement === n || e === t;
	}).map(([e, t]) => {
		let n = t.attributes?.friendly_name ?? e, r = t.attributes?.unit_of_measurement ?? "", i = pc(t.state, r);
		return {
			entityId: e,
			label: i ? `${n} (${i})` : `${n} (${e})`
		};
	}).sort((e, t) => e.label.localeCompare(t.label));
	return t && !i.some((e) => e.entityId === t) && i.push({
		entityId: t,
		label: t
	}), i;
}
function fc(e, t) {
	return {
		enabled: !!e?.enabled,
		max_lead_minutes: Number(e?.max_lead_minutes ?? 1440),
		minimum_delta_temperature: Number(e?.minimum_delta_temperature ?? Fn(t)),
		learning_history_size: Number(e?.learning_history_size ?? 120),
		similar_sample_count: Number(e?.similar_sample_count ?? 25),
		comfort_percentile: Number(e?.comfort_percentile ?? 80),
		adaptive_percentile_enabled: e?.adaptive_percentile_enabled ?? !0,
		partial_expiry_days: Number(e?.partial_expiry_days ?? 30),
		recency_decay_days: Number(e?.recency_decay_days ?? 30),
		min_start_minutes: Number(e?.min_start_minutes ?? 10),
		fallback_minutes_per_degree: Number(e?.fallback_minutes_per_degree ?? Ln(t)),
		use_outdoor_temperature: e?.use_outdoor_temperature ?? !0,
		outdoor_temperature_entity_id: e?.outdoor_temperature_entity_id ?? null,
		room_temperature_entity_id: e?.room_temperature_entity_id ?? null,
		room_sensor_assist_enabled: e?.room_sensor_assist_enabled ?? !1,
		room_sensor_assist_max_delta: Number(e?.room_sensor_assist_max_delta ?? In(t)),
		room_sensor_assist_debounce_seconds: Number(e?.room_sensor_assist_debounce_seconds ?? 20)
	};
}
function pc(e, t) {
	return e === void 0 || e === "unknown" || e === "unavailable" || Number.isNaN(Number(e)) ? "" : `${e}${t ? ` ${t}` : ""}`;
}
//#endregion
//#region src/velair/views/preconditioning-view.ts
var mc = {
	preconditioningAdaptivePercentile: "preconditioningAdaptivePercentileHelp",
	preconditioningComfortPercentile: "preconditioningComfortPercentileHelp",
	preconditioningFallbackMinutesPerDegree: "preconditioningFallbackMinutesPerDegreeHelp",
	preconditioningHistorySize: "preconditioningHistorySizeHelp",
	preconditioningMaxLead: "preconditioningMaxLeadHelp",
	preconditioningMinimumDelta: "preconditioningMinimumDeltaHelp",
	preconditioningMinStart: "preconditioningMinStartHelp",
	preconditioningOutdoorTemperatureEntity: "preconditioningOutdoorTemperatureEntityHelp",
	preconditioningPartialExpiry: "preconditioningPartialExpiryHelp",
	preconditioningRecencyDecay: "preconditioningRecencyDecayHelp",
	preconditioningSimilarSamples: "preconditioningSimilarSamplesHelp",
	preconditioningUseOutdoorTemperature: "preconditioningUseOutdoorTemperatureHelp"
};
function hc(e, t) {
	return y`
    <section class="preconditioning-view">
      <header class="preconditioning-intro">
        <ha-icon icon="mdi:clock-fast"></ha-icon>
        <span>
          <strong>${e._t("preconditioningIntroTitle")}</strong>
          <small>${e._t("preconditioningIntroDetail")}</small>
        </span>
      </header>
      ${t.length ? t.map((t) => gc(e, t)) : y`<span class="empty">${e._t("noManagedEntities")}</span>`}
    </section>
  `;
}
function gc(e, t) {
	let n = e._entityExists(t), r = e._temperatureUnit?.(t) ?? "°C", i = fc(e._data?.zones[t]?.preconditioning, r), a = e._data?.preconditioning_learning?.[t], o = n && e._expandedPreconditioningZones.has(t), s = `preconditioning-zone-content-${t.replace(/[^a-zA-Z0-9_-]/g, "-")}`, c = n ? e._t(o ? "preconditioningCollapseClimate" : "preconditioningExpandClimate", { climate: e._friendlyEntityName(t) }) : e._t("preconditioningUnavailable");
	return y`
    <section class=${`preconditioning-zone ${i.enabled ? "enabled" : "disabled"} ${o ? "expanded" : "collapsed"}`}>
      <header class="preconditioning-zone-heading" @click=${(r) => {
		if (!n) return;
		let i = r.target;
		i instanceof Element && i.closest(".preconditioning-zone-actions") || e._togglePreconditioningZone(t);
	}}>
        <button
          type="button"
          class="preconditioning-zone-toggle"
          title=${c}
          aria-label=${c}
          aria-expanded=${String(o)}
          aria-controls=${o ? s : x}
          ?disabled=${!n}
          @click=${(r) => {
		r.preventDefault(), r.stopPropagation(), n && e._togglePreconditioningZone(t);
	}}
        >
          <ha-icon
            class="preconditioning-expand-icon"
            icon=${o ? "mdi:chevron-down" : "mdi:chevron-right"}
          ></ha-icon>
          <span class="preconditioning-zone-identity">
            <strong title=${e._friendlyEntityName(t)}>
              ${e._friendlyEntityName(t)}
            </strong>
            <span>${t}</span>
          </span>
        </button>
        <div class="preconditioning-zone-actions" @click=${(e) => e.stopPropagation()}>
          <button
            type="button"
            class="icon-button preconditioning-settings-reset"
            title=${e._t("preconditioningResetSettings")}
            aria-label=${e._t("preconditioningResetSettings")}
            ?disabled=${e._settingsSaving}
            @click=${() => e._resetZonePreconditioningSettings(t)}
          >
            <ha-icon icon="mdi:restore"></ha-icon>
          </button>
          <span
            class=${n ? "preconditioning-enable-control" : "preconditioning-enable-control unavailable"}
            title=${n ? "" : e._t("preconditioningUnavailable")}
          >
            <ha-switch
              .checked=${i.enabled}
              ?disabled=${e._settingsSaving || !n}
              @change=${(n) => e._saveZonePreconditioning(t, { enabled: !!n.target.checked })}
            ></ha-switch>
          </span>
        </div>
        ${n ? x : y`<span class="preconditioning-unavailable-message">
              ${e._t("preconditioningUnavailable")}
            </span>`}
      </header>
      ${n && o ? y`
            <div id=${s} class="preconditioning-zone-content">
              ${_c(e, t, i)}
              ${i.enabled ? yc(e, t, a) : x}
            </div>
          ` : x}
    </section>
  `;
}
function _c(e, t, n) {
	let r = e._temperatureUnit?.(t) ?? "°C", i = zn(r);
	return y`
    <div class="preconditioning-config-sections">
      ${vc(e, "preconditioningTiming", "mdi:timer-outline", y`
          ${q(e, t, "preconditioningMinStart", n.min_start_minutes, "min_start_minutes", 0, 1440, 5)}
          ${q(e, t, "preconditioningMaxLead", n.max_lead_minutes, "max_lead_minutes", 0, 1440, 15)}
          ${q(e, t, "preconditioningMinimumDelta", n.minimum_delta_temperature, "minimum_delta_temperature", 0, Rn(r, 5), .1, "", { labelUnit: r })}
          ${q(e, t, "preconditioningFallbackMinutesPerDegree", n.fallback_minutes_per_degree, "fallback_minutes_per_degree", i[0], i[1], .1, "", { labelUnit: `${e._t("minutesShort")}/${r}` })}
        `)}
      ${vc(e, "preconditioningModel", "mdi:tune-variant", y`
          ${q(e, t, "preconditioningComfortPercentile", n.comfort_percentile, "comfort_percentile", 50, 95, 5)}
          ${Nc(e, t, "preconditioningAdaptivePercentile", n.adaptive_percentile_enabled, "adaptive_percentile_enabled")}
          ${q(e, t, "preconditioningSimilarSamples", n.similar_sample_count, "similar_sample_count", 5, 100, 5)}
        `)}
      ${vc(e, "preconditioningHistory", "mdi:history", y`
          ${q(e, t, "preconditioningHistorySize", n.learning_history_size, "learning_history_size", 10, 500, 10)}
          ${q(e, t, "preconditioningPartialExpiry", n.partial_expiry_days, "partial_expiry_days", 1, 365, 1)}
          ${q(e, t, "preconditioningRecencyDecay", n.recency_decay_days, "recency_decay_days", 1, 365, 1)}
        `)}
      ${vc(e, "preconditioningOutdoorContext", "mdi:weather-partly-cloudy", y`
          ${Nc(e, t, "preconditioningUseOutdoorTemperature", n.use_outdoor_temperature, "use_outdoor_temperature")}
          ${Pc(e, t, "preconditioningOutdoorTemperatureEntity", n.outdoor_temperature_entity_id ?? "", "outdoor_temperature_entity_id", { inactive: !n.use_outdoor_temperature })}
        `)}
    </div>
  `;
}
function vc(e, t, n, r) {
	return y`
    <section class="preconditioning-config-section">
      <h3><ha-icon icon=${n}></ha-icon>${e._t(t)}</h3>
      <div class="preconditioning-config-rows">${r}</div>
    </section>
  `;
}
function yc(e, t, n) {
	if (!n) return x;
	let r = [n.heat.status === "unsupported" ? void 0 : bc(e, t, "heat", n.heat), n.cool.status === "unsupported" ? void 0 : bc(e, t, "cool", n.cool)].filter(Boolean);
	return y`
    <div class=${`preconditioning-learning ${n.status}`}>
      <h3 class="preconditioning-learning-heading">
        <ha-icon icon="mdi:chart-line"></ha-icon>
        ${e._t("preconditioningLearningStatus")}
      </h3>
      <div class="preconditioning-directions">
        ${r}
      </div>
    </div>
  `;
}
function bc(e, t, n, r) {
	let i = e._t(n === "heat" ? "preconditioningHeat" : "preconditioningCool"), a = e._t(Mc(r.status)), o = r.total_samples, s = r.model_source === "history", c = e._t(s ? "preconditioningModelHistory" : "preconditioningModelInitial"), l = r.sample_count >= r.required_samples ? String(r.sample_count) : e._t("preconditioningDirectionSamples", {
		count: r.sample_count,
		required: r.required_samples
	});
	return y`
    <div class=${`preconditioning-direction ${n} ${r.status}`}>
      <div class="preconditioning-direction-heading">
        <span>
          <ha-icon icon=${n === "heat" ? "mdi:fire" : "mdi:snowflake"}></ha-icon>
          ${i}
        </span>
        <button
          type="button"
          class="icon-button preconditioning-learning-reset"
          title=${e._t("preconditioningResetLearning")}
          aria-label=${e._t("preconditioningResetLearning")}
          ?disabled=${o === 0 || e._settingsSaving}
          @click=${() => e._resetZonePreconditioningLearning(t, n, i)}
        >
          <ha-icon icon="mdi:restore"></ha-icon>
        </button>
      </div>
      <div class="preconditioning-learning-status-card">
        <div class="preconditioning-learning-summary">
          ${kc(e._t("preconditioningDirectionStatus"), a, r.status === "ready" ? "mdi:check-circle" : "mdi:progress-clock", r.status)}
          ${kc(e._t("preconditioningModelSource"), c, s ? "mdi:chart-timeline-variant" : "mdi:calculator-variant-outline", s ? "history" : "initial")}
        </div>
        <div class="preconditioning-sample-card">
          <div class="preconditioning-sample-chips">
            ${Ac("complete", e._t("preconditioningReachedEvents"), l)}
            ${Ac("partial", e._t("preconditioningPartialEvents"), String(r.partial_sample_count ?? 0))}
            ${Ac("invalid", e._t("preconditioningInvalidEvents"), String(r.invalid_sample_count ?? 0))}
          </div>
        </div>
      </div>
      ${xc(e, t, n)}
    </div>
  `;
}
function xc(e, t, n) {
	let r = Ec(e, t, n);
	if (!r) {
		let t = e._t(n === "heat" ? "preconditioningHeat" : "preconditioningCool");
		return y`
      <section class="preconditioning-prediction empty">
        <div class="preconditioning-prediction-heading">
          <span>${e._t("preconditioningNextBlock")}</span>
          ${Sc(e)}
        </div>
        <div class="preconditioning-prediction-empty">
          <ha-icon icon="mdi:calendar-search"></ha-icon>
          <span>${e._t("preconditioningNoUpcomingDirectionEvent", { direction: t })}</span>
        </div>
      </section>
    `;
	}
	let i = r.target_when && r.target_when !== r.when ? r.target_when : r.when, a = Oc(r.when, i), o = a > 0, s = o ? e._t("preconditioningLeadTime", { minutes: a }) : e._t("preconditioningNormalStart");
	return y`
    <section class=${`preconditioning-prediction ${n} ${o ? "early" : "normal"}`}>
      <div class="preconditioning-prediction-heading">
        <span>${e._t("preconditioningNextBlock")}</span>
        ${Sc(e)}
      </div>
      <div class=${`preconditioning-block-preview ${o ? "with-prestart" : "normal-start"}`}>
        ${o ? y`
              <div class="preconditioning-prestart">
                <small>${e._t("preconditioningStarts")}</small>
                <strong>${e._formatDateTime(r.when)}</strong>
                <span>${s}</span>
              </div>
            ` : x}
        <div class=${`preconditioning-preview-block mode-${n}`}>
          <small>${e._t("preconditioningTargetBy")}</small>
          <strong>${e._formatDateTime(i)}</strong>
          <span>${e._formatEventAction(r)}</span>
          <span>${e._formatEventMode(r)}</span>
        </div>
      </div>
      ${r.preconditioning_diagnostics ? Cc(e, r.preconditioning_diagnostics) : x}
    </section>
  `;
}
function Sc(e) {
	let t = e._t("preconditioningLivePredictionHelp");
	return y`
    <span class="preconditioning-live-label">
      <span>${e._t("preconditioningLivePrediction")}</span>
      <span
        class="preconditioning-help"
        tabindex="0"
        aria-label=${t}
        @click=${(e) => {
		e.preventDefault(), e.stopPropagation();
	}}
      >
        <ha-icon icon="mdi:information-outline"></ha-icon>
        <span class="preconditioning-help-tooltip" role="tooltip">${t}</span>
      </span>
    </span>
  `;
}
function Cc(e, t) {
	return y`
    <details class="preconditioning-calculation-details">
      <summary>
        <ha-icon icon="mdi:calculator-variant-outline"></ha-icon>
        <span>${e._t("preconditioningCalculationDetails")}</span>
      </summary>
      <div class="preconditioning-calculation-grid">
        <div class="preconditioning-calculation-row context">
          ${K(e._t("preconditioningCalculationSamples"), e._t("preconditioningCalculationSampleCounts", {
		reached: t.complete_sample_count,
		partial: t.partial_sample_count,
		invalid: t.invalid_sample_count
	}), "samples")}
          ${K(e._t("preconditioningSimilarSamples"), String(t.similar_sample_count), "compact")}
          ${K(e._t("preconditioningComfortPercentileLabel"), `${t.comfort_percentile}%`, "compact")}
        </div>
        <div class="preconditioning-calculation-row estimates">
          ${K(e._t("preconditioningCalculationReachedEstimate"), Tc(e, t.complete_estimate_minutes))}
          ${K(e._t("preconditioningCalculationPartialFloor"), Tc(e, t.partial_floor_minutes))}
        </div>
        <div class=${`preconditioning-calculation-row result ${wc(t) ? "without-rounded" : "with-rounded"}`}>
          ${K(e._t("preconditioningCalculationCombined"), Tc(e, t.combined_estimate_minutes))}
          ${wc(t) ? x : K(e._t("preconditioningCalculationRounded"), Tc(e, t.rounded_estimate_minutes))}
          ${K(e._t("preconditioningCalculationFinalLead"), Tc(e, t.final_lead_minutes), "final")}
        </div>
      </div>
    </details>
  `;
}
function wc(e) {
	return Math.round(e.combined_estimate_minutes * 10) / 10 === e.rounded_estimate_minutes;
}
function K(e, t, n = "") {
	return y`
    <span class=${`preconditioning-calculation-item ${n}`}>
      <small
        class="preconditioning-calculation-label"
        tabindex="0"
        title=${e}
        aria-label=${e}
      >
        <span class="preconditioning-calculation-label-text">${e}</span>
        <span class="preconditioning-calculation-tooltip" role="tooltip">${e}</span>
      </small>
      <strong>${t}</strong>
    </span>
  `;
}
function Tc(e, t) {
	if (typeof t != "number" || !Number.isFinite(t)) return "-";
	let n = Math.round(t * 10) / 10;
	return e._t("preconditioningFallbackLead", { minutes: n });
}
function Ec(e, t, n) {
	return (e._data?.next_events ?? []).find((e) => e.entity_id === t && Dc(e) === n && typeof e.temperature == "number");
}
function Dc(e) {
	let t = e.preconditioning_diagnostics?.direction;
	if (t === "heat" || t === "cool") return t;
	if (e.hvac_mode === "heat" || e.hvac_mode === "cool") return e.hvac_mode;
}
function Oc(e, t) {
	let n = new Date(e).getTime(), r = new Date(t).getTime();
	return Number.isNaN(n) || Number.isNaN(r) || r <= n ? 0 : Math.round((r - n) / 6e4);
}
function kc(e, t, n, r) {
	return y`
    <div class=${`preconditioning-learning-indicator ${r}`}>
      <ha-icon icon=${n}></ha-icon>
      <span>
        <small>${e}</small>
        <strong>${t}</strong>
      </span>
    </div>
  `;
}
function Ac(e, t, n) {
	return y`
    <span class=${`preconditioning-sample-chip ${e}`}>
      <span>${t}:</span>
      <strong>${n}</strong>
    </span>
  `;
}
function jc(e, t, n = "") {
	let r = mc[t], i = r ? e._t(r) : "";
	return y`
    <span class="label preconditioning-config-label">
      <span>${e._t(t)}${n ? ` (${n})` : ""}</span>
      ${r ? y`
            <span
              class="preconditioning-help"
              tabindex="0"
              aria-label=${i}
              @click=${(e) => {
		e.preventDefault(), e.stopPropagation();
	}}
            >
              <ha-icon icon="mdi:information-outline"></ha-icon>
              <span class="preconditioning-help-tooltip" role="tooltip">${i}</span>
            </span>
          ` : x}
    </span>
  `;
}
function Mc(e) {
	return e === "ready" ? "preconditioningLearningReady" : e === "disabled" ? "preconditioningLearningDisabled" : "preconditioningLearning";
}
function q(e, t, n, r, i, a, o, s, c = "", l = {}) {
	let u = e._settingsSaving || !!l.inactive;
	return y`
    <label class=${`preconditioning-config-row ${l.inactive ? "inactive" : ""}`}>
      ${jc(e, n, l.labelUnit)}
      <span class="preconditioning-number-input"><input
        type="number"
        min=${String(a)}
        max=${String(o)}
        step=${String(s)}
        .value=${String(r)}
        ?disabled=${u}
        @change=${(n) => {
		if (u) return;
		let s = Number(n.currentTarget.value), c = Math.min(o, Math.max(a, Number.isFinite(s) ? s : r));
		e._saveZonePreconditioning(t, { [i]: c });
	}}
      />${c ? y`<span>${c}</span>` : x}</span>
    </label>
  `;
}
function Nc(e, t, n, r, i, a = {}) {
	let o = e._settingsSaving || !!a.inactive;
	return y`
    <label class=${`preconditioning-config-row preconditioning-toggle-row ${a.inactive ? "inactive" : ""}`}>
      ${jc(e, n)}
      <ha-switch
        .checked=${r}
        ?disabled=${o}
        @change=${(n) => e._saveZonePreconditioning(t, { [i]: !!n.target.checked })}
      ></ha-switch>
    </label>
  `;
}
function Pc(e, t, n, r, i, a = {}) {
	let o = e._settingsSaving || !!a.inactive, s = a.inactive ? "" : r, c = dc(e.hass, r);
	return y`
    <label class=${`preconditioning-config-row preconditioning-sensor-row ${a.inactive ? "inactive" : ""}`}>
      ${jc(e, n)}
      <span class="select-wrap">
        <select
          .value=${s}
          value=${s}
          ?disabled=${o}
          @change=${(n) => {
		if (o) return;
		let r = n.currentTarget.value.trim();
		e._saveZonePreconditioning(t, { [i]: r || null });
	}}
        >
          <option value="" ?selected=${s === ""}>
            ${e._t(a.inactive ? "preconditioningOutdoorDisabled" : "preconditioningSelectOutdoorSensor")}
          </option>
          ${c.map((e) => y`
              <option value=${e.entityId} ?selected=${e.entityId === s}>
                ${e.label}
              </option>
            `)}
        </select>
      </span>
    </label>
  `;
}
//#endregion
//#region node_modules/lit-html/directive.js
var Fc = (e) => (...t) => ({
	_$litDirective$: e,
	values: t
}), Ic = class {
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
}, { I: Lc } = Ve, Rc = {}, zc = (e, t = Rc) => e._$AH = t, Bc = Fc(class extends Ic {
	constructor() {
		super(...arguments), this.key = x;
	}
	render(e, t) {
		return this.key = e, t;
	}
	update(e, [t, n]) {
		return t !== this.key && (zc(e), this.key = t), n;
	}
});
//#endregion
//#region src/velair/views/schedule-view.ts
function Vc(e, t, n, r) {
	return y`
    ${Uc(e, t, n)}
    ${n && r ? Wc(e, n, r) : y`<div class="notice">${e._t("noManagedEntities")}</div>`}
  `;
}
function Hc(e, t, n) {
	return y`
    <section class="zones">
      ${t.map((t) => y`
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
function Uc(e, t, n) {
	return t.length ? y`
    <section class="schedule-zone-picker">
      <div class="schedule-step-heading">
        <strong>${e._t("scheduleStepClimate")}</strong>
      </div>
      ${Hc(e, t, n)}
    </section>
  ` : x;
}
function Wc(e, t, n) {
	let r = e._hasDraftValidationError("schedule");
	return y`
    <section class="schedule">
      <div class="schedule-editor-heading">
        <div>
          <strong>${e._t("scheduleStepDay")}</strong>
        </div>
        <div class="schedule-editor-badges">
          ${e._dirty && e._dirtyEntityId === t ? y`<span class="pill warning">${e._t("unsaved")}</span>` : x}
        </div>
      </div>
      ${Gc(e, t, n)}
      <div class="day-tabs">
        ${e._orderedWeekdays().map((t) => Kc(e, t, n.schedule[t] ?? []))}
      </div>
      <div class="schedule-step-heading">
        <strong>${e._t("scheduleStepConfigure")}</strong>
      </div>
      <div class="editor">
        ${qc(e, t, "schedule")}
        <div class="schedule-config-helper">${e._t("templateOptionalHint")}</div>
        <div class="schedule-config-row">
          ${Xc(e)}
        </div>
        <div class="draft-list">
          ${e._draftBlocks.length ? y`
                ${Zc(e, "schedule")}
                ${e._draftBlocks.map((n, r) => Bc(ol("schedule", t, e._selectedWeekday, r), $c(e, n, r, "schedule")))}
                ${Qc(e, "schedule")}
              ` : Qc(e, "schedule")}
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
        ${cl(e)}
        ${ul(e)}
      </div>
    </section>
  `;
}
function Gc(e, t, n) {
	let r = n.override ?? e._data?.active_overrides?.[t];
	if (!Jn(r)) return x;
	let i = Number(r.temperature), a = M(r.until), o = typeof r.hvac_mode == "string" ? r.hvac_mode : "";
	return y`
    <div class="boost-status">
      <ha-icon icon="mdi:lightning-bolt"></ha-icon>
      <div>
        <strong>${e._t("boostActive")}</strong>
        <span>
          ${Number.isFinite(i) ? y`${e._t("boostTarget")}: ${e._formatTemperature(i, t)}` : x}
          ${o ? y` - ${e._modeLabel(o)}` : x}
          ${a ? y` - ${e._t("boostUntil")}: ${e._formatRemaining(Math.max(0, a - Date.now()))}` : x}
        </span>
      </div>
    </div>
  `;
}
function Kc(e, t, n) {
	return y`
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
function qc(e, t, n = "schedule") {
	let r = e._timelineBlocks(n);
	return y`
    <div class="timeline-panel">
      <div class="timeline-header">
        <span class="label">${e._t("timeline")}</span>
        <div class="timeline-hours">
          <span>00</span>
          <span>06</span>
          <span>12</span>
          <span>18</span>
          <span>24</span>
          ${Jc(e)}
        </div>
      </div>
      <div
        class="timeline-track"
        @dragover=${e._handleTimelineDragOver}
        @drop=${(t) => e._handleTimelineDrop(t, n)}
      >
        ${r.length ? r.map((r) => Yc(e, r, t, n)) : y`<span class="empty timeline-empty">${e._t("noBlocks")}</span>`}
      </div>
    </div>
  `;
}
function Jc(e) {
	let t = Zn(e._currentTimelineNow());
	return y`
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
function Yc(e, t, n, r = "schedule") {
	let i = t.draft.action === Xe, a = Number(t.draft.temperature), o = i ? e._t("off") : Number.isFinite(a) ? e._formatTemperature(a, n) : e._t("invalidTemperatureRange"), s = e._formatScheduleTime(t.draft.start), c = i ? "" : t.draft.hvac_mode || e._t("keep"), l = al(e, t.draft), u = l.map((e) => e.short).join(" • "), d = [
		`${s} - ${o}`,
		c ? `${e._t("mode")}: ${c}` : "",
		...l.map((e) => `${e.label}: ${e.value}`)
	].filter(Boolean).join("\n");
	return y`
    <div
      class=${[
		"timeline-block",
		i ? "off" : "",
		`mode-${or(t.draft)}`,
		t.width < 5 ? "compact" : "",
		t.width < 2.5 ? "tiny" : ""
	].filter(Boolean).join(" ")}
      draggable="true"
      role="button"
      style=${`left: ${t.left}%; width: ${t.width}%;`}
      tabindex="0"
      title=${d}
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
      <strong>${s}</strong>
      <span>${o}</span>
      ${c || u ? y`<small>${[c, u].filter(Boolean).join(" • ")}</small>` : x}
      ${t.nextIndex === void 0 ? x : y`
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
function Xc(e) {
	let t = e._scheduleTemplates();
	return y`
    <div class="template-panel">
      <div>
        <span class="label">${e._t("templates")}</span>
        <span class="select-wrap">
          <select
            .value=${e._selectedTemplateKey}
            ?disabled=${!t.length}
            @change=${(t) => {
		let n = t.currentTarget;
		e._selectScheduleTemplate(e._inputValue(t)), n.value = e._selectedTemplateKey;
	}}
          >
            ${t.length ? y`
                  <option value="">${e._t("selectTemplatePlaceholder")}</option>
                  ${t.map((t) => y`<option value=${t.key}>${e._templateLabel(t)}</option>`)}
                ` : y`<option value="">${e._t("noTemplates")}</option>`}
          </select>
        </span>
      </div>
    </div>
  `;
}
function Zc(e, t = "schedule") {
	let n = e._temperatureUnit?.(t === "schedule" ? e._selectedEntity : void 0) ?? "°C";
	return y`
    <div class="draft-list-header" aria-hidden="true">
      <span>${e._t("time")}</span>
      <span>${e._t("mode")}</span>
      <span>${e._t("temp")} (${n})</span>
      <span></span>
      <span></span>
    </div>
  `;
}
function Qc(e, t = "schedule") {
	return y`
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
function $c(e, t, n, r = "schedule") {
	let i = (t.action || "set_temperature") === Xe, a = i ? "off" : t.hvac_mode ?? "", o = e._temperatureError(t, r), [s, c] = e._temperatureLimits(r), l = e._temperatureStep(r), u = Tt(s, l), d = e._temperatureUnit?.(r === "schedule" ? e._selectedEntity : void 0) ?? "°C", f = e._hvacModeOptions(r), p = a && !f.includes(a) ? [...f, a] : f, ee = e._fanModeOptions(r), te = e._presetModeOptions(r), ne = e._swingModeOptions(r), re = e._swingHorizontalModeOptions(r), ie = e._humidityLimits(r), ae = !i && (ee.length > 0 || te.length > 0 || ne.length > 0 || re.length > 0 || !!ie), m = al(e, t), oe = m.length > 0, se = ae || oe, h = oe ? m.map((e) => e.short).join(" • ") : e._t("climateOptionsAdd");
	return y`
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
          ${Bc(sl(r, n, a, p), y`
              <select
                value=${a}
                .value=${a}
                @change=${(t) => e._updateDraftBlock(n, "hvac_mode", e._inputValue(t), r)}
                @input=${(t) => e._updateDraftBlock(n, "hvac_mode", e._inputValue(t), r)}
              >
                <option value="" .selected=${a === ""}>${e._t("keep")}</option>
                ${p.map((t) => y`
                  <option value=${t} .selected=${t === a}>${e._modeLabel(t)}</option>
                `)}
              </select>
            `)}
        </span>
      </label>
      <label>
        <span class="label">${e._t("temp")} (${d})</span>
        <input
          class=${o ? "invalid" : ""}
          type="number"
          min=${String(u)}
          max=${String(c)}
          step=${l === void 0 ? "any" : String(l)}
          ?disabled=${i}
          placeholder=${i ? e._t("off") : ""}
          .value=${i ? "" : String(t.temperature)}
          @input=${(t) => e._updateDraftBlock(n, "temperature", e._inputValue(t), r)}
          @change=${(t) => e._updateDraftBlock(n, "temperature", e._inputValue(t), r)}
        />
        ${o ? y`<small class="field-error">${o}</small>` : x}
      </label>
      ${se ? y`
            <details class="advanced-climate-options" @toggle=${nl}>
              <summary
                class="icon-button climate-options-toggle"
                title=${m.map((e) => `${e.label}: ${e.value}`).join("\n") || e._t("climateOptions")}
                aria-label=${e._t("climateOptions")}
                @click=${el}
              >
                <ha-icon icon="mdi:tune-variant"></ha-icon>
                ${oe ? y`<span class="climate-options-badge">${m.length}</span>` : x}
              </summary>
              <button
                class="climate-options-scrim"
                type="button"
                aria-label=${e._t("dismiss")}
                @click=${tl}
              ></button>
              <fieldset class="advanced-climate-options-fields">
                <legend>${e._t("climateOptions")}</legend>
                ${il(e, t, n, r, "fan_mode", "fanMode", ee)}
                ${il(e, t, n, r, "preset_mode", "presetMode", te)}
                ${il(e, t, n, r, "swing_mode", "swingMode", ne)}
                ${il(e, t, n, r, "swing_horizontal_mode", "horizontalSwingMode", re)}
                ${ie || String(t.humidity ?? "").trim() ? y`
                      <label>
                        <span class="label">${e._t("targetHumidity")}</span>
                        <input
                          type="number"
                          min=${String(ie?.[0] ?? 0)}
                          max=${String(ie?.[1] ?? 100)}
                          step="1"
                          placeholder=${e._t("notSet")}
                          .value=${String(t.humidity ?? "")}
                          @input=${(t) => e._updateDraftBlock(n, "humidity", e._inputValue(t), r)}
                          @change=${(t) => e._updateDraftBlock(n, "humidity", e._inputValue(t), r)}
                        />
                      </label>
                    ` : x}
              </fieldset>
            </details>
          ` : y`<span class="advanced-climate-options-placeholder" aria-hidden="true"></span>`}
      <button
        class="icon-button danger"
        type="button"
        @click=${() => e._removeBlock(n, r)}
        title=${e._t("deleteBlock")}
      >
        <ha-icon icon="mdi:trash-can"></ha-icon>
      </button>
      ${oe ? y`
            <small
              class="climate-options-inline-summary"
              title=${m.map((e) => `${e.label}: ${e.value}`).join("\n")}
            >
              ${h}
            </small>
          ` : x}
    </div>
  `;
}
function el(e) {
	let t = e.currentTarget;
	if (!(t instanceof HTMLElement)) return;
	let n = t.closest("details"), r = t.getRootNode();
	(r instanceof Document || r instanceof ShadowRoot) && r.querySelectorAll(".advanced-climate-options[open]").forEach((e) => {
		e !== n && (e.open = !1);
	});
}
function tl(e) {
	e.preventDefault();
	let t = e.currentTarget;
	if (!(t instanceof HTMLElement)) return;
	let n = t.closest("details");
	n instanceof HTMLDetailsElement && (n.open = !1);
}
function nl(e) {
	let t = e.currentTarget;
	if (!(t instanceof HTMLDetailsElement) || !t.open) return;
	let n = t.querySelector("summary");
	n instanceof HTMLElement && rl(n, t);
}
function rl(e, t) {
	let n = e.getBoundingClientRect(), r = window.innerWidth || document.documentElement.clientWidth || 0, i = window.innerHeight || document.documentElement.clientHeight || 0, a = Math.max(280, Math.min(420, r - 32)), o = n.left + n.width / 2 - a / 2, s = Math.max(16, Math.min(o, r - a - 16)), c = Math.max(0, i - n.bottom - 8 - 16), l = Math.max(0, n.top - 8 - 16), u = l > c && c < 260, d = Math.max(180, u ? l : c), f = u ? n.top - 8 : n.bottom + 8;
	t.style.setProperty("--climate-options-left", `${Math.round(s)}px`), t.style.setProperty("--climate-options-top", `${Math.round(f)}px`), t.style.setProperty("--climate-options-width", `${Math.round(a)}px`), t.style.setProperty("--climate-options-max-height", `${Math.round(d)}px`), t.style.setProperty("--climate-options-translate-y", u ? "-100%" : "0");
}
function il(e, t, n, r, i, a, o) {
	let s = String(t[i] ?? ""), c = s && !o.includes(s) ? [...o, s] : o;
	return !c.length && !s ? x : y`
    <label>
      <span class="label">${e._t(a)}</span>
      <span class="select-wrap">
        <select
          .value=${s}
          @change=${(t) => e._updateDraftBlock(n, i, e._inputValue(t), r)}
          @input=${(t) => e._updateDraftBlock(n, i, e._inputValue(t), r)}
        >
          <option value="" .selected=${s === ""}>${e._t("notSet")}</option>
          ${c.map((e) => y`
            <option value=${e} .selected=${e === s}>${e}</option>
          `)}
        </select>
      </span>
    </label>
  `;
}
function al(e, t) {
	let n = [], r = (t, r) => {
		if (typeof r != "string" || !r.trim()) return;
		let i = e._t(t);
		n.push({
			label: i,
			short: `${i}: ${r}`,
			value: r
		});
	};
	if (r("fanMode", t.fan_mode), r("presetMode", t.preset_mode), r("swingMode", t.swing_mode), r("horizontalSwingMode", t.swing_horizontal_mode), String(t.humidity ?? "").trim()) {
		let r = e._t("targetHumidity"), i = `${t.humidity}%`;
		n.push({
			label: r,
			short: `${r}: ${i}`,
			value: i
		});
	}
	return n;
}
function ol(e, t, n, r) {
	return [
		e,
		t ?? "",
		n ?? "",
		r
	].join(":");
}
function sl(e, t, n, r) {
	return [
		e,
		t,
		n,
		r.join(",")
	].join(":");
}
function cl(e) {
	let t = e._orderedWeekdays();
	return y`
    <div class="copy-panel">
      <div class="copy-header">
        <div>
          <span class="label">${e._t("cloneDayToDays")}</span>
          <strong>${e._t("otherDays")}</strong>
        </div>
      </div>
      <div class="copy-targets">
        ${t.map((t) => ll(e, t))}
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
function ll(e, t) {
	return t === e._selectedWeekday ? y`
      <span class="check-target disabled" title=${e._weekdayName(t)}>
        <span>${e._shortWeekdayName(t)}</span>
      </span>
    ` : y`
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
function ul(e) {
	let t = e._visibleZoneIds(e._data?.configured_entities ?? []).filter((t) => t !== e._selectedEntity);
	return t.length ? y`
    <div class="copy-panel">
      <div class="copy-header">
        <div>
          <span class="label">${e._t("cloneDayToThermostats")}</span>
          <strong>${e._t("otherThermostats")}</strong>
        </div>
      </div>
      <div class="copy-targets wide">
        ${t.map((t) => y`
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
  ` : x;
}
//#endregion
//#region src/velair/views/sensors-view.ts
var dl = {
	climate: "var(--secondary-text-color)",
	climateTarget: "var(--primary-color)",
	room: "var(--success-color, #43a047)",
	target: "var(--error-color, #d93025)"
}, fl = {
	target: 0,
	room: 1,
	climateTarget: 2,
	climate: 3
}, pl = 1.25, ml = 22, J = 10, hl = 20, gl = {
	roomSensorAssist: "roomSensorAssistHelp",
	roomSensorAssistMaxDelta: "roomSensorAssistMaxDeltaHelp",
	roomSensorAssistDebounce: "roomSensorAssistDebounceHelp",
	roomSensorTemperatureEntity: "roomSensorTemperatureEntityHelp"
}, _l = {
	showAssistSwitch: !0,
	showDebounce: !0,
	showLiveStatus: !0,
	showMaxDelta: !0,
	showRoomSensor: !0
};
function vl(e, t, n = {}) {
	let r = yl(n);
	return y`
    <section class="sensors-view">
      <header class="sensors-intro">
        <ha-icon icon="mdi:home-thermometer-outline"></ha-icon>
        <span>
          <strong>${e._t("roomSensorIntroTitle")}</strong>
          <small>${e._t("roomSensorIntroDetail")}</small>
        </span>
      </header>
      ${t.length ? t.map((t) => bl(e, t, r)) : y`<span class="empty">${e._t("noManagedEntities")}</span>`}
    </section>
  `;
}
function yl(e) {
	return {
		..._l,
		...e
	};
}
function bl(e, t, n) {
	let r = e._entityExists(t), i = fc(e._data?.zones[t]?.preconditioning, e._temperatureUnit(t)), a = e._data?.room_sensor_assist?.[t], o = r && e._expandedPreconditioningZones.has(t), s = `sensor-zone-content-${t.replace(/[^a-zA-Z0-9_-]/g, "-")}`, c = r ? e._t(o ? "roomSensorCollapseClimate" : "roomSensorExpandClimate", { climate: e._friendlyEntityName(t) }) : e._t("roomSensorUnavailable"), l = r && !!i.room_temperature_entity_id;
	return y`
    <section class=${`sensor-zone ${i.room_sensor_assist_enabled ? "enabled" : "disabled"} ${o ? "expanded" : "collapsed"}`}>
      <header class="sensor-zone-heading" @click=${(n) => {
		let r = n.target;
		r instanceof Element && r.closest(".sensor-zone-actions") || e._togglePreconditioningZone(t);
	}}>
        <button
          type="button"
          class="sensor-zone-toggle"
          title=${c}
          aria-label=${c}
          aria-expanded=${String(o)}
          aria-controls=${o ? s : x}
          ?disabled=${!r}
          @click=${(n) => {
		n.preventDefault(), n.stopPropagation(), e._togglePreconditioningZone(t);
	}}
        >
          <ha-icon
            class="sensor-expand-icon"
            icon=${o ? "mdi:chevron-down" : "mdi:chevron-right"}
          ></ha-icon>
          <span class="sensor-zone-identity">
            <strong title=${e._friendlyEntityName(t)}>
              ${e._friendlyEntityName(t)}
            </strong>
            <span>${t}</span>
          </span>
        </button>
        ${n.showAssistSwitch ? y`
              <div class="sensor-zone-actions" @click=${(e) => e.stopPropagation()}>
                <span
                  class=${l ? "sensor-enable-control" : "sensor-enable-control unavailable"}
                  title=${l ? "" : e._t("roomSensorNotConfigured")}
                >
                  <ha-switch
                    .checked=${i.room_sensor_assist_enabled}
                    ?disabled=${e._settingsSaving || !l}
                    @change=${(n) => e._saveZonePreconditioning(t, { room_sensor_assist_enabled: !!n.target.checked })}
                  ></ha-switch>
                </span>
              </div>
            ` : x}
      </header>
      ${r && o ? y`
            <div id=${s} class="sensor-zone-content">
              ${xl(e, t, i, n)}
              ${n.showLiveStatus && i.room_temperature_entity_id && !i.room_sensor_assist_enabled ? Sl(e) : x}
              ${n.showLiveStatus && i.room_temperature_entity_id && i.room_sensor_assist_enabled ? Cl(e, t, a) : x}
            </div>
          ` : x}
    </section>
  `;
}
function xl(e, t, n, r) {
	return !r.showRoomSensor && !r.showMaxDelta && !r.showDebounce ? x : y`
    <section class="sensor-config-section">
      <h3><ha-icon icon="mdi:tune-variant"></ha-icon>${e._t("roomSensorAssist")}</h3>
      <div class="sensor-config-rows">
        ${r.showRoomSensor ? Rl(e, t, n.room_temperature_entity_id ?? "") : x}
        ${r.showMaxDelta ? zl(e, t, "roomSensorAssistMaxDelta", "room_sensor_assist_max_delta", n.room_sensor_assist_max_delta, Vl(e._temperatureUnit(t)), Bl(e._temperatureUnit(t)), Vl(e._temperatureUnit(t)), e._temperatureUnit(t), { inactive: !n.room_temperature_entity_id || !n.room_sensor_assist_enabled }) : x}
        ${r.showDebounce ? zl(e, t, "roomSensorAssistDebounce", "room_sensor_assist_debounce_seconds", n.room_sensor_assist_debounce_seconds, 0, 300, 1, e._t("secondsShort"), { inactive: !n.room_temperature_entity_id || !n.room_sensor_assist_enabled }) : x}
      </div>
    </section>
  `;
}
function Sl(e) {
	return y`
    <section class="sensor-runtime-section sensor-inactive-section">
      <h3>
        <ha-icon icon="mdi:power-standby"></ha-icon>
        ${e._t("roomSensorStatusDisabled")}
      </h3>
      <p>${e._t("roomSensorAssistDisabledDetail")}</p>
    </section>
  `;
}
function Cl(e, t, n) {
	if (!n) return x;
	let r = ql(e, t, n), i = typeof n.target_temperature == "number" && !!n.start;
	return y`
    <section class="sensor-runtime-section">
      <h3 class="sensor-runtime-heading">
        <span class="sensor-section-title">
          <ha-icon icon="mdi:pulse"></ha-icon>
          ${e._t("roomSensorLiveStatus")}
        </span>
        ${wl(e, n)}
      </h3>
      <div class="sensor-status-card">
        ${i ? El(e, t, n) : Tl(e)}
        ${i && r.length ? Dl(e, t, r, n) : x}
      </div>
    </section>
  `;
}
function wl(e, t) {
	let n = t?.status ?? "not_configured";
	return y`
    <span class=${`sensor-status-pill ${n}`}>
      ${e._t(Ql(n))}
    </span>
  `;
}
function Tl(e) {
	return y`
    <div class="sensor-idle-state">
      <ha-icon icon="mdi:clock-outline"></ha-icon>
      <span>${e._t("roomSensorNoActiveBlockDetail")}</span>
    </div>
  `;
}
function El(e, t, n) {
	let r = n.start ? e._formatScheduleTime(n.start) : "", i = Zl(e, n.active_from), a = !!(n.target_when && n.active_from), o = typeof n.target_temperature == "number" ? e._formatTemperature(n.target_temperature, t) : e._t("roomSensorValueUnavailable"), s = n.hvac_mode ? e._modeLabel(n.hvac_mode) : e._t("roomSensorValueUnavailable");
	return y`
    <div class="sensor-block-summary">
      ${a ? y`
            <span class="sensor-block-detail emphasis">
              <ha-icon icon="mdi:creation-outline"></ha-icon>
              ${e._t("roomSensorBlockStartedEarly", { time: i })}
            </span>
            <span class="sensor-block-detail">
              <ha-icon icon="mdi:calendar-clock"></ha-icon>
              ${e._t("roomSensorBlockScheduled", { time: r })}
            </span>
          ` : y`
            <span class="sensor-block-detail">
              <ha-icon icon="mdi:calendar-clock"></ha-icon>
              ${e._t("roomSensorBlockScheduled", { time: r })}
            </span>
            <span class="sensor-block-detail">
              <ha-icon icon="mdi:play-circle-outline"></ha-icon>
              ${e._t("roomSensorBlockActiveSince", { time: r })}
            </span>
          `}
      <span class="sensor-block-detail">
        <ha-icon icon="mdi:thermometer"></ha-icon>
        ${e._t("roomSensorBlockTarget", { target: o })}
      </span>
      <span class="sensor-block-detail">
        <ha-icon icon="mdi:hvac"></ha-icon>
        ${e._t("roomSensorBlockMode", { mode: s })}
      </span>
    </div>
  `;
}
function Dl(e, t, n, r) {
	let i = [...n].sort((e, t) => e.value - t.value), a = r.hvac_mode ? `mode-${St(r.hvac_mode)}` : "mode-keep", o = Ul(e, t, n), s = Wl(e, t, n, r), c = Ol(n);
	return y`
    <div class=${`sensor-temperature-scale ${a}`}>
      <div
        class="sensor-scale-track"
        role="group"
        aria-label=${e._t("roomSensorTemperatureScale")}
      >
        <span class="sensor-scale-line"></span>
        ${o ? y`
              <span
                class=${`sensor-scale-relation sensor-scale-room-gap room-gap-${o.position}`}
                style=${[`left: ${o.left.toFixed(2)}%;`, `width: ${o.width.toFixed(2)}%;`].join(" ")}
                title=${o.label}
                role="note"
                aria-label=${o.label}
              >
                <span>${o.label}</span>
              </span>
            ` : x}
        ${s ? y`
              <span
                class=${`sensor-scale-relation sensor-scale-assist-offset assist-offset-${s.state}`}
                style=${[`left: ${s.left.toFixed(2)}%;`, `width: ${s.width.toFixed(2)}%;`].join(" ")}
                title=${s.title}
                role="note"
                aria-label=${`${s.label}. ${s.title}`}
              >
                <span>${s.label}</span>
              </span>
            ` : x}
        ${c.map((e) => y`
            <span
              class=${Al(e)}
              style=${jl(e)}
              role="img"
              aria-label=${Pl(e)}
            >
              <span class=${`sensor-scale-dot ${e.markers.length > 1 ? "segmented" : ""}`}></span>
            </span>
          `)}
        ${n.map((n) => y`
            <span
              class=${`sensor-scale-callout-marker marker-${n.key} lane-${n.lane} ${Fl(n)} ${n.shifted ? "shifted" : ""}`}
              style=${`--callout-left: ${n.calloutPosition.toFixed(2)}%;`}
            >
              ${Il(e, t, n, r)}
            </span>
          `)}
      </div>
      <div class="sensor-scale-bounds">
        <span>${Hl(e, t, i[0]?.value)}</span>
        <span>${Hl(e, t, i[i.length - 1]?.value)}</span>
      </div>
    </div>
  `;
}
function Ol(e) {
	let t = [...e].sort((e, t) => e.position - t.position || fl[e.key] - fl[t.key]), n = [];
	for (let e of t) {
		let t = n[n.length - 1];
		if (t && Math.abs(e.position - t.position) <= pl) {
			t.markers = [...t.markers, e].sort((e, t) => fl[e.key] - fl[t.key]), t.position = kl(t.markers);
			continue;
		}
		n.push({
			markers: [e],
			position: e.position
		});
	}
	return n;
}
function kl(e) {
	return e.reduce((e, t) => e + t.position, 0) / e.length;
}
function Al(e) {
	return [
		"sensor-scale-marker",
		`count-${e.markers.length}`,
		...e.markers.map((e) => `marker-${e.key}`)
	].join(" ");
}
function jl(e) {
	let t = [`left: ${e.position.toFixed(2)}%;`];
	return e.markers.length > 1 && t.push(`--sensor-scale-dot-segments: ${Ml(e.markers)};`), t.join(" ");
}
function Ml(e) {
	let t = [...e].sort((e, t) => t.calloutPosition - e.calloutPosition || e.lane - t.lane || fl[e.key] - fl[t.key]), n = 360 / t.length;
	return `conic-gradient(${t.map((e, t) => {
		let r = Nl(t * n), i = Nl((t + 1) * n);
		return `${dl[e.key]} ${r}deg ${i}deg`;
	}).join(", ")})`;
}
function Nl(e) {
	return Math.round(e * 100) / 100;
}
function Pl(e) {
	return e.markers.map((e) => `${e.label}: ${e.formatted}`).join(", ");
}
function Fl(e) {
	return e.calloutPosition <= J ? "edge-left" : e.calloutPosition >= 100 - J ? "edge-right" : "";
}
function Il(e, t, n, r) {
	let i = n.key === "climateTarget" && typeof r.assist_delta == "number" ? Ts(r.assist_delta, r.direction) : null, a = typeof i == "number" ? Kl(e, t, i) : "", o = e._t("roomSensorAssistOffsetHelp");
	return y`
    <span class="sensor-scale-callout">
      <small>${n.label}</small>
      <span class="sensor-scale-value-row">
        <strong>${n.formatted}</strong>
        ${a ? y`
              <span class="sensor-scale-offset">
                <span>${a}</span>
                <span
                  class="sensor-scale-offset-help"
                  tabindex="0"
                  aria-label=${o}
                  @click=${(e) => {
		e.preventDefault(), e.stopPropagation();
	}}
                >
                  <ha-icon icon="mdi:information-outline"></ha-icon>
                  <span class="sensor-scale-offset-tooltip" role="tooltip">
                    ${o}
                  </span>
                </span>
              </span>
            ` : x}
      </span>
    </span>
  `;
}
function Ll(e, t) {
	let n = gl[t], r = n ? e._t(n) : "";
	return y`
    <span class="label sensor-config-label">
      <span>${e._t(t)}</span>
      ${n ? y`
            <span
              class="sensor-help"
              tabindex="0"
              aria-label=${r}
              @click=${(e) => {
		e.preventDefault(), e.stopPropagation();
	}}
            >
              <ha-icon icon="mdi:information-outline"></ha-icon>
              <span class="sensor-help-tooltip" role="tooltip">${r}</span>
            </span>
          ` : x}
    </span>
  `;
}
function Rl(e, t, n) {
	let r = e._settingsSaving, i = dc(e.hass, n);
	return y`
    <label class="sensor-config-row sensor-picker-row">
      ${Ll(e, "roomSensorTemperatureEntity")}
      <span class="select-wrap">
        <select
          .value=${n}
          value=${n}
          ?disabled=${r}
          @change=${(n) => {
		let r = n.currentTarget.value.trim();
		e._saveZonePreconditioning(t, r ? { room_temperature_entity_id: r } : {
			room_temperature_entity_id: null,
			room_sensor_assist_enabled: !1
		});
	}}
        >
          <option value="" ?selected=${n === ""}>
            ${e._t("roomSensorSelectSensor")}
          </option>
          ${i.map((e) => y`
              <option value=${e.entityId} ?selected=${e.entityId === n}>
                ${e.label} · ${e.entityId}
              </option>
            `)}
        </select>
        ${n ? y`<small class="sensor-selected-entity">${n}</small>` : x}
      </span>
    </label>
  `;
}
function zl(e, t, n, r, i, a, o, s, c, l = {}) {
	let u = e._settingsSaving || !!l.inactive;
	return y`
    <label class=${`sensor-config-row ${l.inactive ? "inactive" : ""}`}>
      ${Ll(e, n)}
      <span class="sensor-number-input">
        <input
          type="number"
          min=${String(a)}
          max=${String(o)}
          step=${String(s)}
          .value=${String(i)}
          ?disabled=${u}
          @change=${(n) => {
		if (u) return;
		let s = Number(n.currentTarget.value), c = Math.min(o, Math.max(a, Number.isFinite(s) ? s : i));
		e._saveZonePreconditioning(t, { [r]: c });
	}}
        />
        <span>${c}</span>
      </span>
    </label>
  `;
}
function Bl(e) {
	return Rn(e, 10);
}
function Vl(e) {
	return .1;
}
function Hl(e, t, n) {
	return typeof n == "number" ? e._formatTemperature(n, t) : e._t("roomSensorValueUnavailable");
}
function Ul(e, t, n) {
	let r = n.find((e) => e.key === "target"), i = n.find((e) => e.key === "room");
	if (!r || !i) return null;
	let a = Math.abs(r.value - i.value);
	if (a < (e._temperatureUnit(t).toUpperCase().includes("F") ? .1 : .05)) return null;
	let o = Gl(e, t, a), s = i.value < r.value ? "below" : "above";
	return {
		label: e._t(s === "below" ? "roomSensorGapBelowTarget" : "roomSensorGapAboveTarget", { value: o }),
		left: Math.min(r.position, i.position),
		position: s,
		width: Math.abs(r.position - i.position)
	};
}
function Wl(e, t, n, r) {
	let i = n.find((e) => e.key === "climate"), a = n.find((e) => e.key === "climateTarget");
	if (!i || !a || typeof r.assist_delta != "number") return null;
	let o = e._temperatureUnit(t).toUpperCase().includes("F") ? .1 : .05, s = typeof r.assist_delta == "number" ? Ts(r.assist_delta, r.direction) : null, c = typeof s == "number" ? typeof s == "number" && Math.abs(s) >= o ? "active" : "holding" : "unknown", l = typeof s == "number" ? Kl(e, t, s) : "";
	return {
		label: c === "active" ? e._t("roomSensorAssistCorrectionValue", { value: l }) : e._t("roomSensorAssistNoCorrection"),
		left: Math.min(i.position, a.position),
		state: c,
		title: c === "active" ? e._t("roomSensorAssistCorrectionActiveHelp") : e._t("roomSensorAssistNoCorrectionHelp"),
		width: Math.abs(i.position - a.position)
	};
}
function Gl(e, t, n) {
	return e._formatTemperature(Math.abs(n), t);
}
function Kl(e, t, n) {
	let r = Gl(e, t, n);
	return n > 0 ? `+${r}` : n < 0 ? `-${r}` : r;
}
function ql(e, t, n) {
	let r = n.status === "assisting" || n.status === "holding" ? n.applied_temperature ?? n.climate_target_temperature : n.climate_target_temperature ?? n.applied_temperature, i = [
		{
			key: "target",
			label: e._t("roomSensorScheduledTarget"),
			value: n.target_temperature
		},
		{
			key: "room",
			label: e._t("roomSensorRoomTemperature"),
			value: n.room_temperature
		},
		{
			key: "climateTarget",
			label: e._t("roomSensorClimateTarget"),
			value: r
		},
		{
			key: "climate",
			label: e._t("roomSensorClimateTemperature"),
			value: n.climate_temperature
		}
	].filter((e) => typeof e.value == "number");
	if (!i.length) return [];
	let a = i.map((e) => e.value), o = Math.min(...a), s = Math.max(...a), c = e._temperatureUnit(t).toUpperCase().includes("F") ? 2 : 1, l = s - o, u = Math.max(l, c), d = (o + s) / 2, f = d - u * .58, p = d + u * .58 - f;
	return Jl(i.map((n) => ({
		...n,
		calloutPosition: 0,
		formatted: e._formatTemperature(n.value, t),
		lane: 0,
		position: Math.max(0, Math.min(100, (n.value - f) / p * 100)),
		shifted: !1
	})));
}
function Jl(e) {
	let t = [...e].sort((e, t) => e.position - t.position), n = /* @__PURE__ */ new Map(), r = [], i = () => {
		if (!r.length) return;
		let e = r.reduce((e, t) => e + t.position, 0) / r.length, t = Yl(r.length, e);
		r.forEach((e, r) => {
			let i = t[r] ?? e.position;
			n.set(e.key, {
				calloutPosition: i,
				lane: r,
				shifted: Math.abs(i - e.position) > .5
			});
		}), r = [];
	};
	for (let e of t) {
		let t = r[r.length - 1];
		t && e.position - t.position > ml && i(), r.push(e);
	}
	return i(), e.map((e) => ({
		...e,
		...n.get(e.key) ?? {
			calloutPosition: e.position,
			lane: 0,
			shifted: !1
		}
	}));
}
function Yl(e, t) {
	if (e <= 1) return [Xl(t, J, 100 - J)];
	let n = (e - 1) * hl, r = t - n / 2, i = J, a = 100 - J;
	return r < i ? r = i : r + n > a && (r = a - n), Array.from({ length: e }, (e, t) => Xl(r + t * hl, i, a));
}
function Xl(e, t, n) {
	return Math.min(n, Math.max(t, e));
}
function Zl(e, t) {
	if (!t) return "";
	let n = new Date(t);
	if (Number.isNaN(n.getTime())) return t;
	let r = `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
	return e._formatScheduleTime(r);
}
function Ql(e) {
	return {
		assisting: "roomSensorStatusAssisting",
		blocked: "roomSensorStatusBlocked",
		disabled: "roomSensorStatusDisabled",
		holding: "roomSensorStatusHolding",
		idle: "roomSensorStatusIdle",
		not_configured: "roomSensorStatusNotConfigured",
		ready: "roomSensorStatusReady",
		unavailable: "roomSensorStatusUnavailable"
	}[e];
}
//#endregion
//#region src/velair/views/settings-view.ts
function $l(e, t) {
	let n = e._firstWeekday(), r = !!e._data?.settings?.apply_active_schedule_on_startup;
	return y`
    <section class="settings-view">
      ${eu(e)}

      <label class="settings-field">
        <span class="label">${e._t("firstWeekday")}</span>
        <span class="select-wrap">
          <select
            .value=${n}
            value=${n}
            @change=${(t) => e._updateSettingsFirstWeekday(e._inputValue(t))}
          >
            ${D.map((t) => y`
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

      ${ru(e)}

      <section class="settings-zone-order">
        <div class="section-heading">
          <ha-icon icon="mdi:sort"></ha-icon>
          <div>
            <span class="section-label">${e._t("zoneOrder")}</span>
            <p>${e._t("reorderZones")}</p>
          </div>
        </div>
        <div class="settings-zone-list">
          ${t.length ? t.map((n, r) => au(e, n, r, t.length)) : y`<span class="empty">${e._t("noManagedEntities")}</span>`}
        </div>
      </section>

      ${tu(e)}
    </section>
  `;
}
function eu(e) {
	let t = !!e._data?.temperature_migration?.required, n = e._data?.home_assistant_temperature_unit ?? e._temperatureUnit(), r = e._data?.temperature_migration, i = r?.reason === "legacy_celsius_upgrade_reset_required", a = r?.source_unit, o = r?.target_unit ?? n;
	return y`
    <section class=${t ? "settings-temperature migration-required" : "settings-temperature"}>
      <ha-icon class="settings-startup-icon" icon="mdi:thermometer-lines"></ha-icon>
      <div class="settings-temperature-copy">
        <span class="section-label">${e._t("temperatureUnit")}</span>
        <p>${e._t("temperatureUnitManagedByHomeAssistant")}</p>
        ${t ? y`
              <div class="temperature-migration-action" role="alert">
                <strong>${i ? e._t("temperatureLegacyResetQuestion", { target: o }) : e._t("temperatureMigrationQuestion", {
		source: a ?? "?",
		target: o
	})}</strong>
                <p>${i ? e._t("temperatureLegacyResetExplanation", { target: o }) : e._t("temperatureMigrationExplanation", {
		source: a ?? "?",
		target: o
	})}</p>
                <div class="temperature-migration-buttons">
                  ${i ? y`
                      <button
                        class="command-button danger"
                        type="button"
                        ?disabled=${e._maintenanceAction === "reset"}
                        @click=${() => e._resetVelairData()}
                      >
                        ${e._maintenanceAction === "reset" ? e._t("resetting") : e._t("resetVelair")}
                      </button>
                    ` : a ? y`
                      <button
                        class="command-button primary"
                        type="button"
                        ?disabled=${!!e._temperatureMigrationAction}
                        @click=${() => e._resolveTemperatureMigration(a)}
                      >
                        ${e._temperatureMigrationAction === a ? e._t("applying") : e._t("temperatureMigrationUse", {
		source: a,
		target: o
	})}
                      </button>
                    ` : x}
                </div>
              </div>
            ` : x}
      </div>
      <strong class="settings-temperature-value">${n}</strong>
    </section>
  `;
}
function tu(e) {
	let t = e._data?.versions ?? {}, r = t.portable_model ?? 5, i = t.storage ?? 1, a = t.model ?? 1, o = e._maintenanceAction === "reset", s = !!e._data?.temperature_migration?.required, c = e._data?.temperature_migration?.reason === "legacy_celsius_upgrade_reset_required";
	return y`
    <section class="settings-maintenance">
      <div class="settings-portability-heading">
        <ha-icon class="settings-startup-icon" icon="mdi:wrench-clock"></ha-icon>
        <div>
          <span class="section-label">${e._t("maintenance")}</span>
          <p>${e._t("maintenanceDescription")}</p>
        </div>
      </div>

      <div class="maintenance-grid">
        ${nu(e._t("frontendBuild"), n)}
        ${nu(e._t("portableFormatVersion"), `v${r}`)}
        ${nu(e._t("internalStorageVersion"), `v${i} / v${a}`)}
        ${nu(e._t("integrationVersion"), "1.5.0")}
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
        ?disabled=${o || s && !c}
        @click=${() => e._resetVelairData()}
      >
        <ha-icon icon="mdi:restore"></ha-icon>
        <span>${o ? e._t("resetting") : e._t("resetVelair")}</span>
      </button>
    </section>
  `;
}
function nu(e, t) {
	return y`
    <div class="maintenance-item">
      <span class="label">${e}</span>
      <strong>${t}</strong>
    </div>
  `;
}
function ru(e) {
	let t = e._importAvailableSections(), n = e._exportSections.size > 0 && !e._portabilityAction, r = !!e._importPayload && e._importSections.size > 0 && !e._portabilityAction, i = new Map(e._portableExportSummaryItems().map((e) => [e.section, e])), a = new Map(e._portableImportSummaryItems().map((e) => [e.section, e])), o = e._importSections.has("preconditioning_learning") ? Zr(e._importPayload, e._data?.configured_entities ?? []) : [], s = !!(e._importPayload && e._importPayload.temperature_unit === void 0);
	return y`
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
            ${nt.map((t) => iu(e, "export", t, e._exportSections.has(t), !1, i.get(t)))}
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
          ${e._importFileName ? y`<span class="empty">${e._t("portabilityFileReady", { file: e._importFileName })}</span>` : x}
          ${e._importPayload ? y`
                <div class="portable-warning" role="alert">
                  <ha-icon icon="mdi:alert-outline"></ha-icon>
                  <span>${e._t("importOverwriteWarning")}</span>
                </div>
              ` : x}
          ${s ? y`
                <div class="portable-warning" role="status">
                  <ha-icon icon="mdi:thermometer-alert"></ha-icon>
                  <span>${e._t("legacyImportTemperatureUnit", { target: e._data?.home_assistant_temperature_unit ?? e._temperatureUnit() })}</span>
                </div>
              ` : x}
          ${o.length ? y`
                <div class="portable-warning" role="alert">
                  <ha-icon icon="mdi:thermometer-alert"></ha-icon>
                  <span>
                    ${e._t("preconditioningImportSkipped", {
		count: o.length,
		entities: o.join(", ")
	})}
                  </span>
                </div>
              ` : x}
          <div class="portability-options">
            ${t.length ? t.map((t) => iu(e, "import", t, e._importSections.has(t), !1, a.get(t))) : y`<span class="empty">${e._t("noImportSections")}</span>`}
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
function iu(e, t, n, r, i, a) {
	return y`
    <label class="portable-option" title=${a?.title ?? e._portableSectionLabel(n)}>
      <input
        type="checkbox"
        .checked=${r}
        ?disabled=${i || !!e._portabilityAction}
        @change=${(r) => e._togglePortableSection(t, n, !!r.currentTarget.checked)}
      />
      ${a && typeof a.value == "number" ? y`<strong>${a.value}</strong>` : x}
      <span>${a?.label ?? e._portableSectionLabel(n)}</span>
    </label>
  `;
}
function au(e, t, n, r) {
	let i = e._entityExists(t), [a, o] = e._entityTemperatureLimits(t), s = e._entityTemperatureStep(t), c = e._climateSupportedModes(t), l = e._climateProvidedData(t), u = e._entityDiagnostic(t), d = e._data?.zones[t]?.preconditioning, f = !!d?.enabled, p = !!(d?.room_sensor_assist_enabled && d?.room_temperature_entity_id);
	return y`
    <div
      class="settings-zone-row"
      @dragover=${(t) => e._handleSettingsZoneDragOver(t)}
      @drop=${(n) => e._handleSettingsZoneDrop(t, n)}
      @dragend=${e._handleSettingsZoneDragEnd}
    >
      <button
        class="settings-drag-handle"
        type="button"
        title=${e._t("reorderZones")}
        aria-label=${e._t("reorderZones")}
        draggable="true"
        @dragstart=${(n) => e._handleSettingsZoneDragStart(t, n)}
        @dragend=${e._handleSettingsZoneDragEnd}
      >
        <ha-icon icon="mdi:drag"></ha-icon>
      </button>
      <div class="settings-zone-main">
        <div class="settings-zone-identity">
          <div class="settings-zone-title">
            <span
              class=${`settings-diagnostic-dot ${u.status}`}
              title=${u.tooltip}
              aria-label=${u.tooltip}
            ></span>
            <strong title=${e._friendlyEntityName(t)}>${e._friendlyEntityName(t)}</strong>
          </div>
          <span>${t}</span>
          ${f ? y`
                <span
                  class="settings-feature-badge preconditioning"
                  title=${e._t("preconditioningEnabled")}
                  aria-label=${e._t("preconditioningEnabled")}
                >
                  <ha-icon icon="mdi:clock-fast"></ha-icon>
                  ${e._t("preconditioning")}
                </span>
              ` : x}
          ${p ? y`
                <span
                  class="settings-feature-badge room-assist"
                  title=${e._t("roomSensorAssistEnabled")}
                  aria-label=${e._t("roomSensorAssistEnabled")}
                >
                  <ha-icon icon="mdi:home-thermometer-outline"></ha-icon>
                  ${e._t("roomSensorAssistBadge")}
                </span>
              ` : x}
          ${u.status === "ok" ? x : y`<span class=${`settings-diagnostic-text ${u.status}`}>${u.messages.join(" · ")}</span>`}
        </div>
        ${i ? y`
              <div class="settings-capability-section settings-capability-row">
                <span class="label">${e._t("availableModes")}</span>
                <div class="settings-mode-tags">
                  ${c.length ? c.map((t) => y`
                          <span class=${`mode-chip mode-${St(t)}`}>
                            ${e._modeLabel(t)}
                          </span>
                        `) : y`<span class="empty">${e._t("keep")}</span>`}
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
                    <span
                      class=${s === void 0 ? "capability-not-reported" : ""}
                      title=${s === void 0 ? e._t("temperatureStepNotReportedDescription") : e._t("temperatureStep")}
                    >
                      <ha-icon icon="mdi:delta"></ha-icon>
                      ${e._t("temperatureStep")}: ${s === void 0 ? e._t("temperatureStepNotReported") : e._formatTemperatureLimit(s)}
                    </span>
                  </div>
                </div>
                <div class="settings-capability-section settings-capability-row">
                  <span class="label">${e._t("providedData")}</span>
                  <div class="settings-data-icons">
                    ${l.map((e) => y`
                        <span title=${e.label} aria-label=${e.label}>
                          <ha-icon icon=${e.icon}></ha-icon>
                        </span>
                      `)}
                  </div>
                  ${l.length ? x : y`<span class="empty">${e._t("noUpcomingEvent")}</span>`}
                </div>
              </div>
            ` : x}
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
function ou(e, t) {
	let n = e._scheduleTemplates(), r = n.find((t) => t.key === e._selectedTemplateKey), i = e._hasDraftValidationError("template"), a = r ? e._templateNameInputValue(r) : "", o = r ? e._templateDraftBlocks : [];
	return n.length ? y`
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
            ${n.map((t) => y`
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
          ${r ? y`
                <div class="template-detail-heading">
                  <label class="template-name-field">
                    ${e._templateDirty ? y`<span class="pill warning">${e._t("unsaved")}</span>` : x}
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
                ${su(e, r)}
                <div class="editor template-editor">
                  ${qc(e, t, "template")}
                  <div class="draft-list template-block-list">
                    ${o.length ? y`
                          ${Zc(e, "template")}
                          ${o.map((t, n) => Bc(ol("template", r.key, void 0, n), $c(e, t, n, "template")))}
                          ${Qc(e, "template")}
                        ` : Qc(e, "template")}
                  </div>
                </div>
              ` : y`
                <div class="template-placeholder compact">
                  <span>${e._t("selectTemplateToBegin")}</span>
                </div>
              `}
        </div>
      </div>
    </section>
  ` : y`
      <section class="template-library">
        <div class="template-placeholder compact">
          <span>${e._t("noTemplates")}</span>
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
function su(e, t) {
	if (!e._templateApplyOpen) return x;
	let n = e._visibleZoneIds(e._data?.configured_entities ?? []), r = e._orderedWeekdays(), i = e._hasDraftValidationError("template"), a = e._templateApplyTargets.size > 0;
	return y`
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
      ${n.length ? y`
            <div class="template-apply-scroll-wrap">
              <div class="template-apply-grid">
                <div class="template-apply-cell template-apply-zone header">${e._t("thermostat")}</div>
                ${r.map((t) => y`
                  <div class="template-apply-cell header day">${e._shortWeekdayName(t)}</div>
                `)}
                ${n.map((t) => y`
                  <div class="template-apply-cell template-apply-zone" title=${e._friendlyEntityName(t)}>
                    ${e._friendlyEntityName(t)}
                  </div>
                  ${r.map((n) => {
		let r = e._templateApplyTargetKey(t, n);
		return y`
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
          ` : y`<span class="empty">${e._t("noManagedEntities")}</span>`}
    </div>
  `;
}
//#endregion
//#region src/velair/controllers/climate-profile-actions.ts
async function cu(e, t) {
	let n = fs(t);
	if (n) throw Error(n);
	return e.setClimateProfile(ps(t));
}
function lu(e, t) {
	return e.deleteClimateProfile(t);
}
function uu(e, t) {
	return e.activateProfile(t);
}
//#endregion
//#region src/velair/domain/modes.ts
var du = new Set([
	"default",
	"predeterminado",
	"manual",
	"unknown",
	"unavailable"
]);
function fu(e) {
	return e.normalize("NFKC").toLowerCase().replaceAll("ß", "ss").replaceAll("ς", "σ");
}
function pu(e) {
	return e ? {
		key: e.key,
		name: e.name,
		profileIds: [...e.profile_ids]
	} : {
		name: "",
		profileIds: []
	};
}
function mu(e, t, n) {
	let r = e.name.trim();
	if (!r || /[\u0000-\u001F\u007F-\u009F]/u.test(e.name)) return "name";
	if (r.length > 255) return "length";
	let i = fu(r);
	if (du.has(i) || t.some((t) => t.key !== e.key && fu(t.name.trim()) === i)) return "duplicate";
	if (!e.profileIds.length || new Set(e.profileIds).size !== e.profileIds.length) return "profile";
	let a = new Map((n ?? []).map((e) => [e.key, e])), o = /* @__PURE__ */ new Set();
	for (let t of e.profileIds) {
		let e = a.get(t);
		if (n && !e) return "profile";
		for (let t of Object.keys(e?.zones ?? {})) {
			if (o.has(t)) return "profile";
			o.add(t);
		}
	}
}
function hu(e) {
	return e?.global.active_profile_ids?.length ? e.modes?.find((t) => t.key === e.active_mode_id) ?? "manual" : "default";
}
//#endregion
//#region src/velair/styles/profile-styles.ts
var gu = u`
  :host {
    display: block;
    color: var(--primary-text-color);
  }

  .profile-intro {
    align-items: center;
    background: var(--secondary-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 10px;
    display: grid;
    gap: 12px;
    grid-template-columns: 32px minmax(0, 1fr);
    margin-bottom: 12px;
    padding: 12px 14px;
  }

  .profile-intro > ha-icon {
    color: var(--primary-color);
  }

  .profile-intro > span {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .profile-intro strong {
    font-size: 14px;
  }

  .profile-intro small {
    color: var(--secondary-text-color);
    line-height: 1.35;
  }

  .profile-library-selector {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: 16px 0;
  }

  .profile-library-tab {
    align-items: center;
    background: var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 10px;
    color: var(--primary-text-color);
    cursor: pointer;
    display: grid;
    gap: 12px;
    grid-template-columns: 28px minmax(0, 1fr) auto;
    min-height: 76px;
    padding: 12px 14px;
    text-align: left;
  }

  .profile-library-tab:hover {
    border-color: var(--primary-color);
  }

  .profile-library-tab:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .profile-library-tab.active {
    background: color-mix(in srgb, var(--primary-color) 8%, var(--card-background-color));
    border-color: var(--primary-color);
  }

  .profile-library-tab > ha-icon {
    --mdc-icon-size: 24px;
    color: var(--primary-color);
  }

  .profile-library-tab-copy {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  .profile-library-tab-copy small {
    color: var(--secondary-text-color);
    font-size: 12px;
    line-height: 1.35;
  }

  .profile-library-tab-count {
    align-items: center;
    background: var(--secondary-background-color);
    border-radius: 10px;
    color: var(--secondary-text-color);
    display: inline-flex;
    font-size: 12px;
    font-weight: 600;
    justify-content: center;
    min-height: 24px;
    min-width: 24px;
    padding: 0 5px;
  }

  [role="tabpanel"][hidden] {
    display: none !important;
  }

  .profile-item-copy span,
  .help {
    color: var(--secondary-text-color);
    font-size: 12px;
  }

  .profile-active-context {
    background: var(--secondary-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 10px;
    display: grid;
    gap: 14px;
    margin-bottom: 16px;
    padding: 14px;
    position: relative;
  }

  :host([compact]) .profile-active-context {
    margin: 14px 0 0;
  }

  :host(:not([compact])) .profile-active-context {
    margin-bottom: 24px;
  }

  .active-setup-heading {
    align-items: center;
    display: grid;
    gap: 12px;
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .active-setup-heading > span {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .active-setup-heading > span > strong {
    font-size: 15px;
  }

  .active-setup-heading > span > small,
  .active-setup-group-heading small {
    color: var(--secondary-text-color);
    font-size: 12px;
    line-height: 1.35;
  }

  .active-setup-summary {
    background: var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 9px;
    display: grid;
    gap: 14px;
    grid-template-columns: minmax(190px, 0.8fr) minmax(0, 1.2fr);
    padding: 12px;
  }

  .active-setup-mode {
    align-items: center;
    display: grid;
    gap: 10px;
    grid-template-columns: 36px minmax(0, 1fr);
    min-width: 0;
  }

  .active-setup-summary-icon {
    align-items: center;
    background: color-mix(in srgb, var(--secondary-text-color) 14%, var(--card-background-color));
    border-radius: 9px;
    color: var(--secondary-text-color);
    display: flex;
    height: 36px;
    justify-content: center;
    width: 36px;
  }

  .active-setup-summary-icon ha-icon {
    --mdc-icon-size: 20px;
  }

  .active-setup-summary-copy {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .active-setup-summary-copy > small,
  .active-setup-summary-label {
    color: var(--secondary-text-color);
    font-size: 11px;
    font-weight: 600;
    line-height: 1.2;
  }

  .active-setup-summary-copy > span {
    color: var(--secondary-text-color);
    font-size: 12px;
    overflow-wrap: break-word;
    white-space: normal;
  }

  .active-setup-profiles {
    border-left: 1px solid var(--divider-color);
    display: grid;
    gap: 7px;
    min-width: 0;
    padding-left: 14px;
  }

  .active-setup-profile-list {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
    min-width: 0;
  }

  .active-setup-profile {
    align-items: center;
    display: inline-grid;
    gap: 6px;
    grid-template-columns: 22px minmax(0, 1fr);
    max-width: 100%;
  }

  .active-setup-profile ha-icon {
    --mdc-icon-size: 20px;
    color: var(--profile-accent);
  }

  .active-setup-profile > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .active-setup-no-profiles,
  .active-setup-empty {
    color: var(--secondary-text-color);
    font-size: 12px;
  }

  .active-setup-menu {
    position: relative;
  }

  .active-setup-menu > summary {
    list-style: none;
  }

  .active-setup-menu > summary::-webkit-details-marker {
    display: none;
  }

  .active-setup-change {
    align-items: center;
    display: inline-flex;
    gap: 6px;
    min-height: 36px;
  }

  .active-setup-change[aria-disabled="true"] {
    cursor: default;
    opacity: 0.55;
    pointer-events: none;
  }

  .active-setup-change ha-icon {
    --mdc-icon-size: 18px;
  }

  .active-setup-popover {
    background: var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.24);
    display: grid;
    gap: 16px;
    max-height: min(560px, calc(100vh - 160px));
    min-width: min(430px, calc(100vw - 32px));
    overflow: auto;
    padding: 12px;
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    width: min(470px, calc(100vw - 32px));
    z-index: 30;
  }

  .active-setup-option-group {
    display: grid;
    gap: 6px;
  }

  .active-setup-option-group + .active-setup-option-group {
    border-top: 1px solid var(--divider-color);
    padding-top: 14px;
  }

  .active-setup-group-heading {
    display: grid;
    gap: 2px;
    margin-bottom: 3px;
  }

  .active-setup-option {
    align-items: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    color: var(--primary-text-color);
    cursor: pointer;
    display: grid;
    gap: 10px;
    grid-template-columns: 26px minmax(0, 1fr) 20px;
    padding: 8px;
    text-align: left;
    width: 100%;
  }

  .active-setup-option:hover:not(:disabled) {
    background: var(--secondary-background-color);
  }

  .active-setup-option:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }

  .active-setup-option.current {
    background: color-mix(in srgb, var(--primary-color) 8%, transparent);
    border-color: color-mix(in srgb, var(--primary-color) 34%, var(--divider-color));
  }

  .active-setup-option:disabled {
    cursor: default;
    opacity: 0.55;
  }

  .active-setup-option-icon {
    --mdc-icon-size: 21px;
    color: var(--profile-accent, var(--primary-color));
  }

  .active-setup-option-icon.neutral {
    color: var(--secondary-text-color);
  }

  .active-setup-option-copy {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .active-setup-option-copy small {
    color: var(--secondary-text-color);
    font-size: 11px;
    line-height: 1.35;
    overflow-wrap: break-word;
    white-space: normal;
  }

  .active-setup-current {
    --mdc-icon-size: 18px;
    color: var(--primary-color);
  }

  .active-setup-linked-profiles {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    margin-top: 4px;
  }

  .active-setup-linked-profiles > span {
    align-items: center;
    color: var(--secondary-text-color);
    display: inline-flex;
    font-size: 11px;
    gap: 4px;
  }

  .active-setup-linked-profiles ha-icon {
    --mdc-icon-size: 16px;
    color: var(--profile-accent);
  }

  .mode-library {
    background: var(--secondary-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 10px;
    display: grid;
    gap: 14px;
    margin-bottom: 16px;
    padding: 14px;
  }

  .library-concept-note {
    align-items: start;
    background: var(--secondary-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    display: grid;
    gap: 10px;
    grid-template-columns: 22px minmax(0, 1fr);
    padding: 10px 12px;
  }

  .library-concept-note > ha-icon {
    --mdc-icon-size: 19px;
    color: var(--primary-color);
  }

  .library-concept-note > span {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

  .library-concept-note small,
  .mode-field small,
  .mode-item small {
    color: var(--secondary-text-color);
    font-size: 12px;
    line-height: 1.35;
  }

  .mode-entity-note {
    align-items: center;
    background: var(--card-background-color);
    border-radius: 8px;
    color: var(--secondary-text-color);
    display: flex;
    flex-wrap: wrap;
    font-size: 12px;
    gap: 6px;
    padding: 9px 10px;
  }

  .mode-entity-note ha-icon {
    --mdc-icon-size: 17px;
    color: var(--primary-color);
  }

  .mode-layout {
    min-width: 0;
  }

  .mode-list {
    align-content: start;
  }

  .mode-item {
    grid-template-columns: minmax(0, 1fr) 34px;
  }

  .mode-item.built-in {
    grid-template-columns: minmax(0, 1fr) 30px 34px;
  }

  .mode-item.built-in .mode-item-main,
  .mode-item.built-in .mode-lock {
    opacity: 0.76;
  }

  .mode-item-main {
    align-items: center;
    display: grid;
    gap: 9px;
    grid-template-columns: 22px minmax(0, 1fr);
    min-width: 0;
  }

  .mode-item.custom .mode-item-main {
    align-items: start;
    gap: 8px;
    grid-template-columns: minmax(0, 1fr);
    padding-bottom: 10px;
    padding-top: 10px;
  }

  .mode-item.custom .mode-delete {
    align-self: start;
    margin-top: 4px;
  }

  .mode-item-identity {
    align-items: center;
    display: grid;
    gap: 9px;
    grid-template-columns: 22px minmax(0, 1fr);
    min-width: 0;
  }

  .mode-item-identity > ha-icon {
    --mdc-icon-size: 19px;
    color: var(--secondary-text-color);
  }

  .mode-item-identity strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mode-item-main > span,
  .mode-field,
  .mode-editor {
    display: grid;
    gap: 6px;
    min-width: 0;
  }

  .mode-item-main strong,
  .mode-item-main small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mode-item-main > ha-icon,
  .mode-lock {
    --mdc-icon-size: 19px;
    color: var(--secondary-text-color);
  }

  .mode-lock {
    justify-self: center;
  }

  .mode-help {
    align-items: center;
    align-self: center;
    background: transparent;
    border: 0;
    color: var(--secondary-text-color);
    cursor: help;
    display: inline-flex;
    height: 30px;
    justify-content: center;
    justify-self: center;
    outline: none;
    padding: 0;
    position: relative;
    width: 30px;
  }

  .mode-help > ha-icon {
    --mdc-icon-size: 18px;
  }

  .mode-help-tooltip {
    background: var(--primary-text-color);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.22);
    color: var(--primary-background-color);
    font-size: 11px;
    font-weight: 400;
    line-height: 1.35;
    max-width: min(240px, calc(100vw - 40px));
    opacity: 0;
    padding: 7px 8px;
    pointer-events: none;
    position: absolute;
    right: 0;
    text-align: left;
    top: calc(100% + 6px);
    transition: opacity 120ms ease, visibility 120ms ease;
    visibility: hidden;
    white-space: normal;
    width: max-content;
    z-index: 20;
  }

  .mode-help:hover .mode-help-tooltip,
  .mode-help:focus .mode-help-tooltip,
  .mode-help:focus-visible .mode-help-tooltip {
    opacity: 1;
    visibility: visible;
  }

  .mode-profile-avatar {
    align-items: center;
    align-self: center;
    background: transparent;
    color: var(--mode-profile-color);
    display: flex;
    height: 24px;
    justify-content: center;
    width: 24px;
  }

  .mode-profile-avatar ha-icon {
    --mdc-icon-size: 20px;
    color: inherit;
  }

  .mode-item-main > .mode-profile-avatars {
    align-items: center;
    color: inherit;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    min-width: 0;
    padding-left: 31px;
  }

  .mode-item-main .mode-profile-avatar {
    color: var(--mode-profile-color);
  }

  .mode-name-row {
    align-items: center;
    display: grid;
    gap: 12px;
    grid-template-columns: minmax(0, 1fr) auto;
    min-width: 0;
  }

  .mode-name-row input {
    min-width: 0;
  }

  .mode-field > span:first-child,
  .mode-name-field > label {
    font-size: 12px;
    font-weight: 600;
  }

  .mode-field input,
  .mode-field select {
    box-sizing: border-box;
    min-height: 40px;
    padding-left: 10px;
    padding-right: 32px;
    width: 100%;
  }

  .mode-field [aria-invalid="true"] {
    border-color: var(--error-color);
  }

  .mode-profile-choices {
    border: 0;
    display: grid;
    gap: 8px;
    margin: 0;
    min-width: 0;
    padding: 0;
  }

  .mode-profile-choices legend {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 8px;
    padding: 0;
  }

  .mode-profile-choice {
    align-items: center;
    border: 1px solid var(--divider-color);
    border-radius: 10px;
    cursor: pointer;
    display: grid;
    gap: 10px;
    grid-template-columns: auto auto minmax(0, 1fr);
    padding: 9px 10px;
  }

  .mode-profile-choice.selected {
    background: color-mix(in srgb, var(--primary-color) 8%, transparent);
    border-color: var(--primary-color);
  }

  .mode-profile-choice input {
    min-height: auto;
    padding: 0;
    width: auto;
  }

  .mode-profile-choice > span:last-child {
    display: grid;
    min-width: 0;
  }

  .mode-profile-choice code {
    color: var(--secondary-text-color);
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .profile-library {
    min-width: 0;
  }

  .profile-list .template-item {
    grid-template-columns: minmax(0, 1fr) 34px 34px;
  }

  .profile-item-activate {
    background: transparent !important;
    border-color: transparent !important;
    box-shadow: none;
    color: var(--success-color, #2e7d32);
    height: 34px;
    width: 34px;
  }

  .profile-item-activate:hover:not(:disabled) {
    background: transparent !important;
    border-color: transparent !important;
    color: color-mix(in srgb, var(--success-color, #2e7d32) 78%, var(--primary-text-color));
  }

  .profile-item-activate.active {
    background: #2e7d32 !important;
    border-color: #2e7d32 !important;
    color: #ffffff;
    opacity: 1;
  }

  .profile-item-activate.active:hover:not(:disabled) {
    background: #256628 !important;
    border-color: #256628 !important;
    color: #ffffff;
  }

  .profile-list-empty {
    padding: 16px;
  }

  .profile-item-main {
    align-items: center;
    display: grid;
    gap: 10px;
    grid-template-columns: 24px minmax(0, 1fr);
  }

  .profile-item-main > ha-icon {
    color: var(--profile-item-accent, var(--primary-color));
  }

  .profile-item-copy {
    display: grid;
    gap: 2px;
    min-width: 0;
    text-align: left;
  }

  .profile-item-copy strong,
  .profile-item-copy code,
  .profile-item-copy span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .profile-item-copy code {
    color: var(--secondary-text-color);
    font-family: var(--code-font-family, monospace);
    font-size: 11px;
  }

  .profile-editor,
  .profile-zones,
  .profile-zone,
  .profile-week {
    display: grid;
    gap: 12px;
    min-width: 0;
  }

  .profile-actions,
  .zone-heading,
  .week-heading {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .profile-heading-main {
    display: grid;
    gap: 6px;
    min-width: min(320px, 100%);
  }

  .profile-name-field {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .profile-name-input-wrap {
    align-items: center;
    display: grid;
    gap: 8px;
    grid-template-columns: 20px minmax(0, 1fr);
  }

  .profile-name-input-wrap ha-icon {
    --mdc-icon-size: 18px;
    color: var(--secondary-text-color);
  }

  .profile-name-input-wrap input {
    font-size: 18px;
    font-weight: 600;
    min-width: 0;
  }

  .profile-heading-id {
    align-items: center;
    color: var(--secondary-text-color);
    display: flex;
    flex-wrap: wrap;
    font-size: 12px;
    gap: 5px;
    padding-left: 28px;
  }

  .profile-heading-id code {
    overflow-wrap: anywhere;
  }

  .profile-actions,
  .zone-heading,
  .week-heading {
    justify-content: space-between;
  }

  .metadata {
    display: grid;
    gap: 12px;
    grid-template-columns: minmax(0, 1fr);
  }

  .profile-metadata-row {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .profile-field-label,
  .profile-metadata-row > label {
    color: var(--primary-text-color);
    font-size: 12px;
    font-weight: 600;
  }

  .profile-readonly-value {
    background: color-mix(in srgb, var(--secondary-background-color) 76%, var(--card-background-color));
    border: 1px dashed var(--divider-color);
    border-radius: 8px;
    box-sizing: border-box;
    color: var(--secondary-text-color);
    min-height: 38px;
    padding: 9px 10px;
    user-select: all;
    width: 100%;
  }

  .profile-readonly-value code {
    overflow-wrap: anywhere;
  }

  .metadata textarea {
    background: var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    box-sizing: border-box;
    color: var(--primary-text-color);
    font: inherit;
    line-height: 1.4;
    min-height: 72px;
    padding: 9px 10px;
    resize: vertical;
    width: 100%;
  }

  .profile-character-count {
    color: var(--secondary-text-color);
    font-size: 11px;
    justify-self: end;
  }

  .profile-icon-input-wrap {
    align-items: center;
    display: grid;
    gap: 8px;
    grid-template-columns: 40px minmax(0, 1fr);
  }

  .profile-color-input-wrap {
    align-items: center;
    display: flex;
    gap: 10px;
  }

  .profile-color-input-wrap input[type="color"] {
    background: var(--card-background-color);
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    box-sizing: border-box;
    cursor: pointer;
    height: 40px;
    padding: 3px;
    width: 52px;
  }

  .profile-color-code-input {
    font-family: var(--code-font-family, monospace);
    max-width: 150px;
    min-width: 100px;
  }

  .profile-color-invalid-icon {
    --mdc-icon-size: 18px;
    color: var(--error-color);
    flex: 0 0 auto;
  }

  .profile-icon-preview {
    align-items: center;
    background: var(--profile-draft-color, var(--primary-color));
    border: 1px solid var(--profile-draft-color, var(--primary-color));
    border-radius: 8px;
    color: white;
    display: flex;
    height: 40px;
    justify-content: center;
    margin: 0;
  }

  .profile-icon-preview.invalid {
    background: color-mix(in srgb, var(--error-color) 10%, transparent);
    border-color: var(--error-color);
    color: var(--error-color);
  }

  .profile-icon-preview.color-invalid {
    background: var(--secondary-background-color);
    border-color: var(--error-color);
    border-style: dashed;
    color: var(--secondary-text-color);
  }

  .profile-icon-help {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
    justify-content: space-between;
  }

  .profile-icon-help a {
    align-items: center;
    color: var(--primary-color);
    display: inline-flex;
    gap: 4px;
    text-decoration: none;
  }

  .profile-icon-help a:hover {
    text-decoration: underline;
  }

  .profile-icon-help a ha-icon {
    --mdc-icon-size: 14px;
  }

  .profile-zone {
    border: 1px solid var(--divider-color);
    border-radius: 10px;
    padding: 12px;
  }

  .profile-zone.collapsed {
    gap: 0;
  }

  .profile-zone-content {
    display: grid;
    gap: 12px;
    min-width: 0;
  }

  .profile-zone-toggle {
    align-items: center;
    background: transparent;
    border: 0;
    color: inherit;
    cursor: pointer;
    display: grid;
    gap: 8px;
    grid-template-columns: 20px minmax(0, 1fr);
    min-width: 0;
    padding: 0;
    text-align: left;
  }

  .profile-zone-toggle > ha-icon {
    --mdc-icon-size: 19px;
    color: var(--secondary-text-color);
  }

  .profile-zone-identity {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .profile-zone-identity strong,
  .profile-zone-identity span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .profile-zone-identity span {
    color: var(--secondary-text-color);
    font-family: var(--code-font-family, monospace);
    font-size: 10px;
  }

  .profile-zone-actions,
  .profile-pause-action {
    display: grid;
    gap: 4px;
  }

  .profile-zone-actions .select-wrap {
    margin-top: 2px;
    min-width: 210px;
  }

  .profile-zone-actions select {
    box-sizing: border-box;
    min-height: 42px;
    padding-left: 10px;
    padding-right: 32px;
    width: 100%;
  }

  .profile-zone-actions > span:first-child,
  .profile-pause-action > span:first-child {
    color: var(--primary-text-color);
    font-size: 12px;
    font-weight: 600;
  }

  .profile-week {
    background: var(--secondary-background-color);
    border-radius: 8px;
    padding: 10px;
  }

  .profile-template-select {
    min-width: min(240px, 100%);
  }

  .profile-schedule-config-row {
    grid-template-columns: minmax(180px, 340px);
  }

  .profile-block-list {
    margin-top: 0;
  }

  @media (max-width: 760px) {
    .active-setup-summary {
      grid-template-columns: minmax(0, 1fr);
    }

    .active-setup-profiles {
      border-left: 0;
      border-top: 1px solid var(--divider-color);
      padding-left: 0;
      padding-top: 12px;
    }

    .mode-layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 600px) {
    .profile-library-selector {
      grid-template-columns: minmax(0, 1fr);
    }

    .active-setup-heading {
      align-items: stretch;
      grid-template-columns: minmax(0, 1fr);
    }

    .active-setup-menu,
    .active-setup-change {
      width: 100%;
    }

    .active-setup-change {
      box-sizing: border-box;
      justify-content: center;
    }

    .active-setup-popover {
      box-sizing: border-box;
      margin-top: 8px;
      max-height: none;
      min-width: 0;
      position: static;
      width: 100%;
    }

    .profile-detail-heading {
      align-items: center;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .profile-heading-main {
      min-width: 0;
    }

    .profile-detail-heading .template-detail-actions {
      align-self: center;
      margin-right: 0;
    }
  }

  @container (max-width: 760px) {
    .active-setup-summary {
      grid-template-columns: minmax(0, 1fr);
    }

    .active-setup-profiles {
      border-left: 0;
      border-top: 1px solid var(--divider-color);
      padding-left: 0;
      padding-top: 12px;
    }
  }

  @container (max-width: 600px) {
    .active-setup-heading {
      align-items: stretch;
      grid-template-columns: minmax(0, 1fr);
    }

    .active-setup-menu,
    .active-setup-change {
      width: 100%;
    }

    .active-setup-change {
      box-sizing: border-box;
      justify-content: center;
    }

    .active-setup-popover {
      box-sizing: border-box;
      margin-top: 8px;
      max-height: none;
      min-width: 0;
      position: static;
      width: 100%;
    }
  }

  @media (max-width: 480px) {
    .zone-heading,
    .week-heading {
      align-items: stretch;
      flex-direction: column;
    }

    .zone-heading {
      gap: 10px;
    }

    .profile-zone-toggle,
    .profile-zone-actions {
      width: 100%;
    }

    .profile-zone-actions .select-wrap {
      min-width: 0;
      width: 100%;
    }

    .profile-heading-id {
      padding-left: 0;
    }

    .profile-template-select {
      width: 100%;
    }

    .active-setup-option {
      grid-template-columns: 24px minmax(0, 1fr) 18px;
    }
  }
`;
//#endregion
//#region \0@oxc-project+runtime@0.133.0/helpers/esm/decorate.js
function Y(e, t, n, r) {
	var i = arguments.length, a = i < 3 ? t : r === null ? r = Object.getOwnPropertyDescriptor(t, n) : r, o;
	if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a = Reflect.decorate(e, t, n, r);
	else for (var s = e.length - 1; s >= 0; s--) (o = e[s]) && (a = (i < 3 ? o(a) : i > 3 ? o(t, n, a) : o(t, n)) || a);
	return i > 3 && a && Object.defineProperty(t, n, a), a;
}
//#endregion
//#region src/velair/components/profiles-view-element.ts
var X = class extends w {
	constructor(...e) {
		super(...e), this.compact = !1, this.activeSetupControls = "both", this._selectedKey = "", this._draft = H(), this._selectedDays = {}, this._cloneDayTargets = {}, this._dirty = !1, this._expandedZones = /* @__PURE__ */ new Set(), this._selectedModeKey = "", this._modeEditorOpen = !1, this._modeDraft = pu(), this._modeDirty = !1, this._activeLibrary = "profiles", this._handleDocumentClick = (e) => {
			let t = this.shadowRoot?.querySelector(".active-setup-menu");
			!t?.open || e.composedPath().includes(t) || (t.open = !1);
		}, this._clearSelection = () => {
			this._selectedKey = "", this._draft = H(), this._selectedDays = {}, this._cloneDayTargets = {}, this._expandedZones = /* @__PURE__ */ new Set(), this._setDirty(!1), this._clearNotices();
		}, this._createMode = () => {
			this._discardModeChanges() && (this._selectedModeKey = "", this._modeDraft = pu(), this._modeEditorOpen = !0, this._setModeDirty(!1));
		};
	}
	connectedCallback() {
		super.connectedCallback(), this.ownerDocument.addEventListener("click", this._handleDocumentClick);
	}
	disconnectedCallback() {
		this.ownerDocument.removeEventListener("click", this._handleDocumentClick), super.disconnectedCallback();
	}
	willUpdate(e) {
		if (!e.has("data")) return;
		if (this._modeEditorOpen && this._selectedModeKey) {
			let e = this.data?.modes?.find((e) => e.key === this._selectedModeKey);
			e ? this._modeDirty || (this._modeDraft = pu(e)) : this._clearModeSelection();
		}
		let t = (this.data?.profiles ?? []).find((e) => e.key === this._selectedKey);
		if (this._dirty) {
			this._selectedKey && !t && (this._clearSelection(), this._error = this._t("profileRemovedElsewhere"));
			return;
		}
		t ? this._draft = H(t) : this._selectedKey && this._clearSelection();
	}
	render() {
		let e = this._renderActiveSelector(), t = this._error ? y`<div class="notice error" role="alert">${this._error}</div>` : x;
		return this.compact ? y`${e}${t}` : y`
      <header class="profile-intro">
        <ha-icon icon="mdi:account-switch-outline"></ha-icon>
        <span>
          <strong>${this._t("profilesAndModes")}</strong>
          <small>${this._t("profilesPanelIntro")}</small>
        </span>
      </header>
      ${e}
      ${t}
      ${this._renderLibrarySelector()}
      <div
        id="profiles-library-panel"
        role="tabpanel"
        aria-labelledby="profiles-library-tab"
        ?hidden=${this._activeLibrary !== "profiles"}
      >
        ${this._renderLibrary()}
      </div>
      <div
        id="modes-library-panel"
        role="tabpanel"
        aria-labelledby="modes-library-tab"
        ?hidden=${this._activeLibrary !== "modes"}
      >
        ${this._renderModes()}
      </div>
    `;
	}
	_renderLibrarySelector() {
		let e = this.data?.profiles ?? [], t = this.data?.modes ?? [];
		return y`
      <nav class="profile-library-selector" role="tablist" aria-label=${this._t("profileLibrarySelectorLabel")}>
        ${this._renderLibraryTab("profiles", "mdi:account-switch-outline", this._t("profiles"), e.length, this._t("profilesLibraryDescription"))}
        ${this._renderLibraryTab("modes", "mdi:format-list-bulleted", this._t("modesTitle"), t.length + 2, this._t("modesLibraryDescription"))}
      </nav>
    `;
	}
	_renderLibraryTab(e, t, n, r, i) {
		let a = this._activeLibrary === e;
		return y`
      <button
        id=${`${e}-library-tab`}
        class=${a ? "profile-library-tab active" : "profile-library-tab"}
        type="button"
        role="tab"
        aria-selected=${String(a)}
        aria-controls=${`${e}-library-panel`}
        tabindex=${a ? "0" : "-1"}
        @click=${() => {
			this._activeLibrary = e;
		}}
        @keydown=${(t) => this._handleLibraryTabKeydown(t, e)}
      >
        <ha-icon icon=${t}></ha-icon>
        <span class="profile-library-tab-copy">
          <strong>${n}</strong>
          <small>${i}</small>
        </span>
        <span class="profile-library-tab-count" aria-label=${String(r)}>${r}</span>
      </button>
    `;
	}
	_handleLibraryTabKeydown(e, t) {
		let n;
		e.key === "ArrowRight" || e.key === "ArrowLeft" ? n = t === "profiles" ? "modes" : "profiles" : e.key === "Home" ? n = "profiles" : e.key === "End" && (n = "modes"), n && (e.preventDefault(), this._activeLibrary = n, this.updateComplete.then(() => {
			this.shadowRoot?.querySelector(`#${n}-library-tab`)?.focus();
		}));
	}
	_renderLibrary() {
		let e = this.data?.profiles ?? [], t = e.find((e) => e.key === this._selectedKey);
		return y`
      <section class="template-library profile-library">
        <div class="library-concept-note">
          <ha-icon icon="mdi:account-switch-outline"></ha-icon>
          <span>
            <strong>${this._t("profiles")}</strong>
            <small>${this._t("profilesDescription")}</small>
          </span>
        </div>
        <div class="template-library-layout">
          <div class="template-list-wrap">
            <div class="template-list-heading">
              <div class="section-heading">
                <ha-icon icon="mdi:account-switch-outline"></ha-icon>
                <span class="section-label">${this._t("profiles")} (${e.length})</span>
              </div>
              <button
                class="icon-button primary"
                type="button"
              ?disabled=${!!this._busy}
                @click=${() => void this._createProfile()}
                title=${this._t("profileCreate")}
              >
                <ha-icon icon="mdi:plus"></ha-icon>
              </button>
            </div>
            <div class="template-list profile-list" aria-label=${this._t("profiles")}>
              ${e.length ? e.map((e) => this._renderListItem(e)) : y`<span class="empty profile-list-empty">${this._t("profileNoneCreated")}</span>`}
            </div>
          </div>
          <div class="template-detail profile-detail">
            ${t ? this._renderEditor() : y`<div class="template-placeholder compact"><span>${this._t("profileSelectToBegin")}</span></div>`}
          </div>
        </div>
      </section>
    `;
	}
	_renderListItem(e) {
		let t = this.data?.global.active_profile_ids?.includes(e.key) ?? !1, n = t && !!this.data?.active_mode_id, r = t && !n || !!this._busy || this._operationRunning() || this._dirty;
		return y`
      <div
        class=${e.key === this._selectedKey ? "template-item active" : "template-item"}
        style=${`--profile-item-accent: ${U(e.key, e.color)}`}
      >
        <button
          class="template-item-main profile-item-main"
          type="button"
          aria-pressed=${String(e.key === this._selectedKey)}
          @click=${() => this._selectProfile(e)}
        >
          <ha-icon icon=${e.icon || "mdi:account-outline"}></ha-icon>
          <span class="profile-item-copy">
            <strong>${e.name}</strong>
            <code class="profile-item-id">${e.key}</code>
            <span>${t ? this._t("profileActive") : e.description || this._t("profileNoDescription")}</span>
          </span>
        </button>
        <button
          class=${t ? "icon-button success profile-item-activate active" : "icon-button success profile-item-activate"}
          type="button"
          aria-pressed=${String(t)}
          ?disabled=${r}
          @click=${(t) => {
			t.stopPropagation(), this._activate(e.key);
		}}
          title=${t && !n ? this._t("profileActive") : this._t("profileActivate")}
        >
          <ha-icon icon=${t ? "mdi:check-circle" : "mdi:play-circle-outline"}></ha-icon>
        </button>
        <button
          class="icon-button danger template-item-delete"
          type="button"
          ?disabled=${this._busy === "delete"}
          @click=${(t) => {
			t.stopPropagation(), this._deleteProfile(e);
		}}
          title=${this._t("profileDelete")}
        >
          <ha-icon icon="mdi:trash-can"></ha-icon>
        </button>
      </div>
    `;
	}
	_renderActiveSelector() {
		let e = ns(this.data), t = this.data?.global.active_profile_ids ?? [], n = this.data?.profiles ?? [], r = this.data?.modes ?? [], i = hu(this.data), a = i === "default" ? this._t("modeDefault") : i === "manual" ? this._t("modeManual") : i.name, o = i === "default" ? "default" : i === "manual" ? "manual" : `custom:${i.key}`, s = typeof i == "string" ? [] : i.profile_ids.map((e) => n.find((t) => t.key === e)).filter((e) => !!e), c = i === "default" ? this._t("modeDefaultDescription") : i === "manual" ? this._t("modeManualDescription") : this._t("modeCustomDescription", { profile: s.map((e) => e.name).join(", ") }), l = !!this._busy || this._operationRunning() || this._dirty || this._modeDirty, u = this.activeSetupControls === "modes" || this.activeSetupControls === "profiles" ? this.activeSetupControls : "both", d = u !== "profiles", f = u !== "modes";
		return y`
      <section class="profile-active-context active-setup-card" aria-label=${this._t("activeSetup")}>
        <div class="active-setup-heading">
          <span>
            <strong>${this._t("activeSetup")}</strong>
            <small>${this._t("activeSetupDescription")}</small>
          </span>
          <details
            class="active-setup-menu"
            @keydown=${this._handleActiveSetupMenuKeydown}
          >
            <summary
              class="command-button secondary active-setup-change"
              aria-disabled=${String(l)}
              @click=${(e) => {
			l && e.preventDefault();
		}}
              @keydown=${(e) => {
			l && (e.key === "Enter" || e.key === " ") && e.preventDefault();
		}}
            >
              <ha-icon icon="mdi:swap-horizontal"></ha-icon>
              <span>${this._t("activeSetupChange")}</span>
            </summary>
            <div class="active-setup-popover">
              ${d ? y`<section class="active-setup-option-group" aria-labelledby="active-setup-modes-heading">
                <div class="active-setup-group-heading">
                  <strong id="active-setup-modes-heading">${this._t("modesTitle")}</strong>
                  <small>${this._t("activeSetupModesHelp")}</small>
                </div>
                ${this._renderActiveModeOption("default", this._t("modeDefault"), this._t("modeDefaultDescription"), "mdi:calendar-clock-outline", o === "default", [], l)}
                ${r.map((e) => {
			let t = e.profile_ids.map((e) => n.find((t) => t.key === e)).filter((e) => !!e);
			return this._renderActiveModeOption(`custom:${e.key}`, e.name, this._t("modeCustomDescription", { profile: t.map((e) => e.name).join(", ") }), "mdi:format-list-bulleted", o === `custom:${e.key}`, t, l);
		})}
              </section>` : x}
              ${f ? y`<section class="active-setup-option-group" aria-labelledby="active-setup-profiles-heading">
                <div class="active-setup-group-heading">
                  <strong id="active-setup-profiles-heading">${this._t("activeSetupManualProfile")}</strong>
                  <small>${this._t("activeSetupManualProfileHelp")}</small>
                </div>
                ${d ? x : this._renderActiveModeOption("default", this._t("modeDefault"), this._t("modeDefaultDescription"), "mdi:calendar-clock-outline", o === "default", [], l)}
                ${n.length ? n.map((e) => this._renderActiveProfileOption(e, o === "manual" && t.length === 1 && t[0] === e.key, l)) : y`<span class="empty active-setup-empty">${this._t("profileNoneCreated")}</span>`}
              </section>` : x}
            </div>
          </details>
        </div>
        <div class="active-setup-summary">
          <div class="active-setup-mode">
            <span class="active-setup-summary-icon neutral"><ha-icon icon="mdi:format-list-bulleted"></ha-icon></span>
            <span class="active-setup-summary-copy">
              <small>${this._t("modeLabel")}</small>
              <strong>${a}</strong>
              <span title=${c}>${c}</span>
            </span>
          </div>
          <div class="active-setup-profiles">
            <span class="active-setup-summary-label">${this._t("activeSetupAppliedProfiles")}</span>
            ${e.length ? y`
                <span class="active-setup-profile-list">
                  ${e.map((e) => y`
                    <span
                      class="active-setup-profile"
                      style=${`--profile-accent: ${U(e.key, e.color)}`}
                      title=${e.description || e.name}
                    >
                      <ha-icon icon=${e.icon || "mdi:account-outline"}></ha-icon>
                      <span>${e.name}</span>
                    </span>
                  `)}
                </span>
              ` : y`<span class="active-setup-no-profiles">${this._t("activeSetupNoProfiles")}</span>`}
          </div>
        </div>
      </section>
    `;
	}
	_renderActiveModeOption(e, t, n, r, i, a, o) {
		return y`
      <button
        class=${i ? "active-setup-option current" : "active-setup-option"}
        type="button"
        data-mode-selection=${e}
        aria-current=${i ? "true" : x}
        ?disabled=${o}
        @click=${() => void this._chooseActiveMode(e)}
      >
        <ha-icon class="active-setup-option-icon neutral" icon=${r}></ha-icon>
        <span class="active-setup-option-copy">
          <strong>${t}</strong>
          <small>${n}</small>
          ${a.length ? y`
              <span class="active-setup-linked-profiles">
                ${a.map((e) => y`
                  <span style=${`--profile-accent: ${U(e.key, e.color)}`}>
                    <ha-icon icon=${e.icon || "mdi:account-outline"}></ha-icon>
                    <span>${e.name}</span>
                  </span>
                `)}
              </span>
            ` : x}
        </span>
        ${i ? y`<ha-icon class="active-setup-current" icon="mdi:check"></ha-icon>` : x}
      </button>
    `;
	}
	_renderActiveProfileOption(e, t, n) {
		return y`
      <button
        class=${t ? "active-setup-option profile current" : "active-setup-option profile"}
        style=${`--profile-accent: ${U(e.key, e.color)}`}
        type="button"
        data-profile-id=${e.key}
        aria-current=${t ? "true" : x}
        ?disabled=${n}
        @click=${() => void this._chooseActiveProfile(e.key)}
      >
        <ha-icon class="active-setup-option-icon" icon=${e.icon || "mdi:account-outline"}></ha-icon>
        <span class="active-setup-option-copy">
          <strong>${e.name}</strong>
          <small>${e.description || this._t("profileNoDescription")}</small>
        </span>
        ${t ? y`<ha-icon class="active-setup-current" icon="mdi:check"></ha-icon>` : x}
      </button>
    `;
	}
	async _chooseActiveMode(e) {
		await this._selectActiveMode(e), this._closeActiveSetupMenu();
	}
	async _chooseActiveProfile(e) {
		await this._activate(e), this._closeActiveSetupMenu();
	}
	_closeActiveSetupMenu() {
		let e = this.shadowRoot?.querySelector(".active-setup-menu");
		e && (e.open = !1, e.querySelector("summary")?.focus());
	}
	_handleActiveSetupMenuKeydown(e) {
		if (e.key !== "Escape") return;
		let t = e.currentTarget;
		t.open && (e.preventDefault(), t.open = !1, t.querySelector("summary")?.focus());
	}
	_renderModes() {
		let e = this.data?.modes ?? [];
		return y`
      <section class="template-library mode-library" aria-label=${this._t("modesTitle")}>
        <div class="library-concept-note">
          <ha-icon icon="mdi:format-list-bulleted"></ha-icon>
          <span>
            <strong>${this._t("modesTitle")}</strong>
            <small>${this._t("modesDescription")}</small>
          </span>
        </div>
        <div class="mode-entity-note">
          <ha-icon icon="mdi:home-assistant"></ha-icon>
          <span>${this._t("modesEntityNote")}</span>
        </div>
        <div class="template-library-layout mode-layout">
          <div class="template-list-wrap">
            <div class="template-list-heading">
              <div class="section-heading">
                <ha-icon icon="mdi:format-list-bulleted"></ha-icon>
                <span class="section-label">${this._t("modesTitle")} (${e.length + 2})</span>
              </div>
              <button class="icon-button primary mode-create" type="button" ?disabled=${!!this._busy} @click=${this._createMode} title=${this._t("modeCreate")}>
                <ha-icon icon="mdi:plus"></ha-icon>
              </button>
            </div>
            <div class="template-list mode-list" aria-label=${this._t("modesTitle")}>
              ${this._renderBuiltInMode("default")}
              ${this._renderBuiltInMode("manual")}
              ${e.map((e) => this._renderModeListItem(e))}
            </div>
          </div>
          <div class="template-detail mode-detail">
            ${this._modeEditorOpen ? this._renderModeEditor() : y`<div class="template-placeholder compact"><span>${this._t("modeSelectToBegin")}</span></div>`}
          </div>
        </div>
      </section>
    `;
	}
	_renderBuiltInMode(e) {
		let t = e === "default" ? this._t("modeDefault") : this._t("modeManual"), n = e === "default" ? this._t("modeDefaultDescription") : this._t("modeManualDescription"), r = `mode-${e}-help`;
		return y`
      <div class="template-item mode-item built-in">
        <div class="template-item-main mode-item-main">
          <ha-icon icon=${e === "default" ? "mdi:calendar-clock-outline" : "mdi:gesture-tap"}></ha-icon>
          <span><strong>${t}</strong></span>
        </div>
        <button
          class="mode-help"
          type="button"
          aria-label=${this._t("modeInformation", { mode: t })}
          aria-describedby=${r}
          @click=${(e) => e.stopPropagation()}
        >
          <ha-icon icon="mdi:information-outline"></ha-icon>
          <span id=${r} class="mode-help-tooltip" role="tooltip">${n}</span>
        </button>
        <ha-icon class="mode-lock" icon="mdi:lock-outline" title=${this._t("modeBuiltInHelp")}></ha-icon>
      </div>
    `;
	}
	_renderModeListItem(e) {
		let t = e.profile_ids.map((e) => ({
			profileId: e,
			profile: this.data?.profiles?.find((t) => t.key === e)
		})), n = t.map(({ profileId: e, profile: t }) => t?.name ?? e).join(", ");
		return y`
      <div
        class=${e.key === this._selectedModeKey ? "template-item mode-item custom active" : "template-item mode-item custom"}
        role="group"
        aria-label=${`${e.name}. ${this._t("modeMappedProfiles", { profiles: n })}`}
      >
        <button
          class="template-item-main mode-item-main"
          type="button"
          aria-pressed=${String(e.key === this._selectedModeKey)}
          @click=${() => this._selectMode(e)}
        >
          <span class="mode-item-identity">
            <ha-icon icon="mdi:format-list-bulleted"></ha-icon>
            <strong>${e.name}</strong>
          </span>
          <span class="mode-profile-avatars" title=${n}>
            ${t.map(({ profileId: e, profile: t }) => y`
              <span
                class="mode-profile-avatar"
                style=${`--mode-profile-color: ${t ? U(e, t.color) : "var(--error-color)"}`}
                role="img"
                aria-label=${t ? this._t("modeMappedProfile", { profile: t.name }) : this._t("modeMappedProfileMissing", { profile: e })}
              ><ha-icon icon=${t?.icon || (t ? "mdi:account-outline" : "mdi:alert-outline")}></ha-icon></span>
            `)}
          </span>
        </button>
        <button class="icon-button danger template-item-delete mode-delete" type="button" ?disabled=${!!this._busy} @click=${() => void this._deleteMode(e)} title=${this._t("modeDelete")}>
          <ha-icon icon="mdi:trash-can"></ha-icon>
        </button>
      </div>
    `;
	}
	_renderModeEditor() {
		let e = this.data?.profiles ?? [], t = mu(this._modeDraft, this.data?.modes ?? [], e);
		return y`
      <section class="mode-editor">
        <div class="mode-field mode-name-field">
          <label for="mode-name-input">${this._t("modeName")}</label>
          <div class="mode-name-row">
            <input id="mode-name-input" maxlength=${255} .value=${this._modeDraft.name} aria-invalid=${String(!!(t && t !== "profile"))} @input=${(e) => this._updateModeDraft("name", e.currentTarget.value)} />
            <button
              class="icon-button primary mode-save"
              type="button"
              ?disabled=${!!this._busy || !this._modeDirty || !!t}
              @click=${() => void this._saveMode()}
              title=${this._t("save")}
              aria-label=${this._t("save")}
            >
              <ha-icon icon="mdi:content-save"></ha-icon>
            </button>
          </div>
          <small>${t === "name" ? this._t("modeNameRequired") : t === "length" ? this._t("modeNameTooLong", { count: 255 }) : t === "duplicate" ? this._t("modeNameDuplicate") : this._t("modeNameHelp")}</small>
        </div>
        <fieldset class="mode-field mode-profile-choices" aria-invalid=${String(t === "profile")}>
          <legend>${this._t("modeProfiles")}</legend>
          ${e.map((e) => y`
            <label class=${this._modeDraft.profileIds.includes(e.key) ? "mode-profile-choice selected" : "mode-profile-choice"}>
              <input
                type="checkbox"
                .checked=${this._modeDraft.profileIds.includes(e.key)}
                @change=${() => this._toggleModeProfile(e.key)}
              />
              <span
                class="mode-profile-avatar"
                style=${`--mode-profile-color: ${U(e.key, e.color)}`}
              ><ha-icon icon=${e.icon || "mdi:account-outline"}></ha-icon></span>
              <span><strong>${e.name}</strong><code>${e.key}</code></span>
            </label>
          `)}
          <small>${t === "profile" ? this._t("modeProfileRequired") : this._t("modeProfileHelp")}</small>
        </fieldset>
      </section>
    `;
	}
	_renderEditor() {
		let e = this._draft.icon?.trim() || "mdi:account-outline", t = !this._draft.icon?.trim() || /^mdi:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e), n = this._draft.color || U(this._draft.key), r = /^#[0-9a-f]{6}$/i.test(n), i = r ? n : U(this._draft.key), a = 500 - (this._draft.description?.length ?? 0), o = a >= 0, s = this._unsupportedScheduleModeError(), c = this._hasScheduleValidationError();
		return y`
      <section class="profile-editor">
        <div class="template-detail-heading profile-detail-heading">
          <div class="profile-heading-main">
            <label class="profile-name-field">
              <span class="profile-field-label">${this._t("profileName")}</span>
              <div class="profile-name-input-wrap">
                <ha-icon icon="mdi:pencil"></ha-icon>
                <input
                  aria-label=${this._t("profileName")}
                  .value=${this._draft.name}
                  @input=${(e) => this._updateMetadata("name", e)}
                />
              </div>
            </label>
            <div class="profile-heading-id">
              <span>${this._t("profileId")}</span>
              <code>${this._draft.key}</code>
              ${this._dirty ? y`<span class="pill warning">${this._t("unsaved")}</span>` : x}
            </div>
          </div>
          <div class="template-detail-actions">
            <button
              class="icon-button primary"
              type="button"
              ?disabled=${!!this._busy || !this._draft.name.trim() || !t || !r || !o || c}
              @click=${() => void this._save()}
              title=${this._t("save")}
            >
              <ha-icon icon="mdi:content-save"></ha-icon>
            </button>
          </div>
        </div>
        ${s ? y`<div class="notice error profile-schedule-error" role="alert">${s}</div>` : x}
        <div class="metadata">
          <div class="profile-color-field profile-metadata-row">
            <label for="profile-color-picker">${this._t("profileColor")}</label>
            <span class="profile-color-input-wrap">
              <input
                id="profile-color-picker"
                type="color"
                .value=${i}
                @input=${(e) => this._updateMetadata("color", e)}
                aria-label=${this._t("profileColor")}
              />
              <input
                id="profile-color-code"
                class=${r ? "profile-color-code-input" : "profile-color-code-input invalid"}
                type="text"
                spellcheck="false"
                .value=${n}
                aria-label=${this._t("profileColor")}
                aria-invalid=${String(!r)}
                @input=${(e) => this._updateMetadata("color", e)}
              />
              ${r ? x : y`<ha-icon class="profile-color-invalid-icon" icon="mdi:alert-circle"></ha-icon>`}
            </span>
            <small class=${r ? "help" : "field-error"}>
              ${this._t(r ? "profileColorHelp" : "profileInvalidColor")}
            </small>
          </div>
          <div class="profile-icon-field profile-metadata-row">
            <label for="profile-icon-input">${this._t("profileIcon")}</label>
            <span class="profile-icon-input-wrap">
              <span
                class=${t ? r ? "profile-icon-preview" : "profile-icon-preview color-invalid" : "profile-icon-preview invalid"}
                style=${t && r ? `--profile-draft-color: ${n}` : ""}
              >
                <ha-icon icon=${t ? e : "mdi:help-circle-outline"}></ha-icon>
              </span>
              <input
                id="profile-icon-input"
                class=${t ? "" : "invalid"}
                .value=${this._draft.icon ?? ""}
                placeholder="mdi:account-outline"
                aria-invalid=${String(!t)}
                @input=${(e) => this._updateMetadata("icon", e)}
              />
            </span>
            <small class=${t ? "help profile-icon-help" : "field-error profile-icon-help"}>
              <span>${this._t(t ? "profileIconHelp" : "profileInvalidIcon")}</span>
              <a href="https://pictogrammers.com/library/mdi/" target="_blank" rel="noopener noreferrer">
                ${this._t("profileBrowseIcons")}
                <ha-icon icon="mdi:open-in-new"></ha-icon>
              </a>
            </small>
          </div>
          <div class="description profile-metadata-row">
            <label for="profile-description-input">${this._t("profileDescription")}</label>
            <textarea
              id="profile-description-input"
              maxlength=${500}
              .value=${this._draft.description ?? ""}
              @input=${(e) => this._updateMetadata("description", e)}
            ></textarea>
            <small class=${o ? "profile-character-count" : "field-error"}>
              ${this._t("profileDescriptionCharactersRemaining", { count: Math.max(0, a) })}
            </small>
          </div>
        </div>
        <div class="profile-zones">
          ${(this.data?.configured_entities ?? []).length ? Bt(this.data?.configured_entities ?? [], this.data?.settings?.zone_order ?? []).map((e) => this._renderZone(e)) : y`<span class="empty">${this._t("noManagedEntities")}</span>`}
        </div>
      </section>
    `;
	}
	_renderZone(e) {
		let t = this._draft.zones[e], n = os(t), r = this._expandedZones.has(e), i = `profile-zone-content-${e.replace(/[^a-zA-Z0-9_-]/g, "-")}`, a = this.hass?.states?.[e]?.attributes?.friendly_name ?? e, o = this._t(r ? "profileCollapseClimate" : "profileExpandClimate", { climate: a }), s = () => this._toggleZone(e);
		return y`
      <article class=${`profile-zone ${r ? "expanded" : "collapsed"}`}>
        <div
          class="zone-heading"
          @click=${(e) => {
			let t = e.target;
			(!(t instanceof Element) || !t.closest(".profile-zone-actions")) && s();
		}}
        >
          <button
            class="profile-zone-toggle"
            type="button"
            title=${o}
            aria-label=${o}
            aria-expanded=${String(r)}
            aria-controls=${r ? i : x}
            @click=${(e) => {
			e.preventDefault(), e.stopPropagation(), s();
		}}
          >
            <ha-icon icon=${r ? "mdi:chevron-down" : "mdi:chevron-right"}></ha-icon>
            <span class="profile-zone-identity">
              <strong title=${a}>${a}</strong>
              <span>${e}</span>
            </span>
          </button>
          <label class="profile-zone-actions" @click=${(e) => e.stopPropagation()}>
            <span>${this._t("profileZoneBehavior")}</span>
            <span class="select-wrap">
              <select .value=${n} @change=${(t) => this._setZoneBehavior(e, t.currentTarget.value)}>
                <option value="normal">${this._t("profileBehaviorDefault")}</option>
                <option value="schedule">${this._t("profileBehaviorSchedule")}</option>
                <option value="pause">${this._t("profileBehaviorPause")}</option>
              </select>
            </span>
          </label>
        </div>
        ${r ? y`
          <div class="profile-zone-content" id=${i}>
            ${t?.behavior === "pause" ? y`
              <label class="profile-pause-action"><span>${this._t("profilePauseAction")}</span>
                <span class="select-wrap">
                  <select .value=${t.action} @change=${(t) => this._setPauseAction(e, t.currentTarget.value)}>
                    <option value="none">${this._t("profilePauseKeep")}</option>
                    <option value="turn_off">${this._t("profilePauseTurnOff")}</option>
                  </select>
                </span>
              </label>
            ` : x}
            ${t?.behavior === "schedule" ? this._renderSchedule(e, t) : x}
          </div>
        ` : x}
      </article>
    `;
	}
	_renderSchedule(e, t) {
		let n = zt(this.data?.settings?.first_weekday ?? D[0]), r = this._selectedDays[e] ?? n[0], i = t.schedule[r] ?? [], a = new Set([...this._cloneDayTargets[e] ?? []].filter((e) => e !== r)), o = this._blockEditorHost(e, r);
		return y`
      <div class="profile-week">
        <div class="day-tabs">
          ${n.map((n) => y`
            <button
              type="button"
              class=${n === r ? "day-tab active" : "day-tab"}
              aria-pressed=${String(n === r)}
              @click=${() => this._selectDay(e, n)}
            >
              <span>${gt(k(this.hass), n).slice(0, 3)}</span>
              <strong>${t.schedule[n]?.length ?? 0}</strong>
            </button>
          `)}
        </div>
        ${qc(o, e, "template")}
        <div class="schedule-config-helper">${this._t("templateOptionalHint")}</div>
        <div class="schedule-config-row profile-schedule-config-row">
          <div class="template-panel">
            <div>
              <span class="label">${this._t("templates")}</span>
              <span class="select-wrap profile-template-select">
                <select
                  aria-label=${this._t("selectTemplatePlaceholder")}
                  ?disabled=${!this.data?.templates?.length}
                  @change=${(t) => this._copyTemplate(e, r, t.currentTarget)}
                >
                  ${this.data?.templates?.length ? y`
                        <option value="">${this._t("selectTemplatePlaceholder")}</option>
                        ${this.data.templates.map((e) => y`<option value=${e.key}>${e.name}</option>`)}
                      ` : y`<option value="">${this._t("noTemplates")}</option>`}
                </select>
              </span>
            </div>
          </div>
        </div>
        <div class="draft-list profile-block-list">
          ${i.length ? y`
                ${Zc(o, "template")}
                ${i.map((t, n) => Bc(ol("template", `${this._selectedKey}:${e}`, r, n), $c(o, t, n, "template")))}
                ${Qc(o, "template")}
              ` : Qc(o, "template")}
        </div>
        <div class="copy-panel profile-day-copy">
          <div class="copy-header">
            <div>
              <span class="label">${this._t("cloneDayToDays")}</span>
              <strong>${this._t("otherDays")}</strong>
            </div>
          </div>
          <div class="copy-targets">
            ${n.filter((e) => e !== r).map((t) => y`
                <label class="check-target" title=${gt(k(this.hass), t)}>
                  <input
                    type="checkbox"
                    .checked=${a.has(t)}
                    @change=${(n) => this._toggleCloneDayTarget(e, t, n.currentTarget.checked)}
                  />
                  <span>${gt(k(this.hass), t).slice(0, 3)}</span>
                </label>
              `)}
          </div>
          <div class="copy-actions">
            <button
              class="command-button success"
              type="button"
              ?disabled=${a.size === 0 || this._hasScheduleValidationError()}
              @click=${() => this._cloneSelectedDay(e, r, a)}
            >
              <ha-icon icon="mdi:content-copy"></ha-icon>
              <span>${this._t("cloneAction")}</span>
            </button>
          </div>
        </div>
      </div>
    `;
	}
	async _createProfile() {
		if (this._dirty && !window.confirm(this._t("profileDiscardChanges"))) return;
		let e = this.hass ? new j(this.hass) : void 0;
		if (!e || this._busy) return;
		let t = ds(this._t("profileNewName"), this.data?.profiles ?? []);
		this._busy = "save", this._clearNotices();
		try {
			let n = await cu(e, {
				...H(),
				name: t
			});
			this._emitData(n);
			let r = n.profiles?.find((e) => e.key === n.profile_id) ?? n.profiles?.find((e) => e.name === t);
			r && (this._selectedKey = r.key, this._draft = H(r), this._selectedDays = {}, this._cloneDayTargets = {}, this._expandedZones = /* @__PURE__ */ new Set()), this._setDirty(!1), this._showSuccess(this._t("profileSaved"));
		} catch (e) {
			this._error = this._errorMessage(e, "profileInvalidSchedule");
		} finally {
			this._busy = void 0;
		}
	}
	_selectProfile(e) {
		this._dirty && !window.confirm(this._t("profileDiscardChanges")) || (this._selectedKey = e.key, this._draft = H(e), this._selectedDays = {}, this._cloneDayTargets = {}, this._expandedZones = /* @__PURE__ */ new Set(), this._setDirty(!1), this._clearNotices());
	}
	_updateMetadata(e, t) {
		this._draft = {
			...this._draft,
			[e]: t.currentTarget.value
		}, this._setDirty(!0);
	}
	_setZoneBehavior(e, t) {
		this._draft = ss(this._draft, e, t), this._setDirty(!0);
	}
	_setPauseAction(e, t) {
		this._draft = {
			...this._draft,
			zones: {
				...this._draft.zones,
				[e]: {
					behavior: "pause",
					action: t
				}
			}
		}, this._setDirty(!0);
	}
	_selectDay(e, t) {
		this._selectedDays = {
			...this._selectedDays,
			[e]: t
		};
		let n = new Set(this._cloneDayTargets[e] ?? []);
		n.delete(t), this._cloneDayTargets = {
			...this._cloneDayTargets,
			[e]: n
		};
	}
	_toggleCloneDayTarget(e, t, n) {
		let r = new Set(this._cloneDayTargets[e] ?? []);
		n ? r.add(t) : r.delete(t), this._cloneDayTargets = {
			...this._cloneDayTargets,
			[e]: r
		};
	}
	_cloneSelectedDay(e, t, n) {
		let r = this._draft.zones[e];
		r?.behavior !== "schedule" || n.size === 0 || (this._draft = {
			...this._draft,
			zones: {
				...this._draft.zones,
				[e]: {
					...r,
					schedule: ls(r.schedule, t, n)
				}
			}
		}, this._cloneDayTargets = {
			...this._cloneDayTargets,
			[e]: /* @__PURE__ */ new Set()
		}, this._setDirty(!0));
	}
	_toggleZone(e) {
		let t = new Set(this._expandedZones);
		t.has(e) ? t.delete(e) : t.add(e), this._expandedZones = t;
	}
	_blocks(e, t) {
		let n = this._draft.zones[e];
		return n?.behavior === "schedule" ? [...n.schedule[t] ?? []] : [];
	}
	_setBlocks(e, t, n) {
		let r = this._draft.zones[e];
		r?.behavior === "schedule" && (this._draft = {
			...this._draft,
			zones: {
				...this._draft.zones,
				[e]: {
					...r,
					schedule: {
						...r.schedule,
						[t]: n
					}
				}
			}
		}, this._setDirty(!0));
	}
	_addBlock(e, t) {
		let n = this._blocks(e, t);
		this._setBlocks(e, t, kr(n, us(n), this.data?.temperature_unit));
	}
	_removeBlock(e, t, n) {
		this._setBlocks(e, t, Ar(this._blocks(e, t), n));
	}
	_updateBlock(e, t, n, r, i) {
		this._setBlocks(e, t, jr(this._blocks(e, t), n, r, i));
	}
	_copyTemplate(e, t, n) {
		let r = n.value;
		if (!r) return;
		let i = this.data?.templates?.find((e) => e.key === r);
		i && this._setBlocks(e, t, Or(i.blocks, this.data?.temperature_unit)), n.value = "";
	}
	_blockEditorHost(e, t) {
		let n = this.hass?.states?.[e], r = Ct(n, this.data?.temperature_unit), i = wt(n), a = {
			classList: this.classList,
			renderRoot: this.renderRoot,
			_selectedEntity: e,
			_data: this.data,
			_t: (e, t = {}) => this._t(e, t),
			_temperatureError: (t) => this._temperatureError(e, t),
			_temperatureLimits: () => r,
			_temperatureStep: () => i,
			_temperatureUnit: () => this.data?.temperature_unit ?? "°C",
			_hvacModeOptions: () => Et(n),
			_fanModeOptions: () => Dt(n),
			_presetModeOptions: () => Ot(n),
			_swingModeOptions: () => kt(n),
			_swingHorizontalModeOptions: () => At(n),
			_humidityLimits: () => jt(n),
			_modeLabel: (e) => vt(k(this.hass), "hvacModes", e),
			_updateDraftBlock: (n, r, i) => this._updateBlock(e, t, n, r, i),
			_removeBlock: (n) => this._removeBlock(e, t, n),
			_addBlock: () => this._addBlock(e, t),
			_inputValue: (e) => e.currentTarget.value,
			_formatTemperatureLimit: (e) => this._formatTemperatureLimit(e),
			_currentTimelineNow: () => /* @__PURE__ */ new Date(),
			_formatScheduleTime: (e) => na(e, $i(k(this.hass)), this.hass?.locale?.time_format),
			_formatTemperature: (e) => ia(e, this.data?.temperature_unit ?? "°C"),
			_blocksForSource: () => this._blocks(e, t),
			_setBlocksForSource: (n, r) => this._setBlocks(e, t, r)
		};
		return a._setDraftBlockStart = (n, r, i = {}) => {
			let o = this._blocks(e, t);
			o[n] && (o[n] = {
				...o[n],
				start: r
			}, this._setBlocks(e, t, o), i.sort && Ai(a, "template"));
		}, a._sortDraftBlocksByStart = () => Ai(a, "template"), a._resizeTimelineBlock = (e, t, n) => ki(a, e, t, n, "template"), a._timelineBlocks = () => ji(a, "template"), a._handleTimelineDragStart = (e, t, n) => xi(a, e, t, n), a._handleTimelineDragOver = (e) => Si(e), a._handleTimelineDrop = (e, t = "template") => Ci(a, e, t), a._handleTimelineDragEnd = () => Ti(a), a._handleTimelineResizeStart = (e, t, n, r) => Ei(a, e, t, n, r), a._handleTimelineResizeMove = (e) => Di(a, e), a._handleTimelineResizeEnd = (e) => Oi(a), a;
	}
	_formatTemperatureLimit(e) {
		return String(Number.isInteger(e) ? e : Number(e.toFixed(2)));
	}
	_temperatureError(e, t) {
		let n = this.hass?.states?.[e], [r, i] = Ct(n, this.data?.temperature_unit), a = wt(n);
		return Mr(t, {
			minTemperature: r,
			maxTemperature: i,
			temperatureStep: a,
			rangeError: this._t("invalidTemperatureRange", {
				min: this._formatTemperatureLimit(r),
				max: this._formatTemperatureLimit(i)
			}),
			stepError: this._t("invalidTemperatureStep", { step: this._formatTemperatureLimit(a ?? 1) })
		});
	}
	_hasScheduleValidationError() {
		return fs(this._draft) === "schedule" || this._unsupportedScheduleModeError() ? !0 : Object.entries(this._draft.zones).some(([e, t]) => t.behavior === "schedule" && D.some((n) => (t.schedule[n] ?? []).some((t) => !!this._temperatureError(e, t))));
	}
	_unsupportedScheduleModeError() {
		for (let [e, t] of Object.entries(this._draft.zones)) {
			if (t.behavior !== "schedule") continue;
			let n = this.hass?.states?.[e];
			for (let r of D) {
				let i = Fr(t.schedule[r] ?? [], Et(n));
				if (i?.hvac_mode) return this._t("unsupportedModeForClimate", {
					entity: n?.attributes?.friendly_name ?? e,
					mode: vt(k(this.hass), "hvacModes", i.hvac_mode),
					start: i.start
				});
			}
		}
	}
	_selectMode(e) {
		this._discardModeChanges() && (this._selectedModeKey = e.key, this._modeDraft = pu(e), this._modeEditorOpen = !0, this._setModeDirty(!1));
	}
	_discardModeChanges() {
		return !this._modeDirty || window.confirm(this._t("modeDiscardChanges"));
	}
	_clearModeSelection() {
		this._selectedModeKey = "", this._modeDraft = pu(), this._modeEditorOpen = !1, this._setModeDirty(!1);
	}
	_updateModeDraft(e, t) {
		this._modeDraft = {
			...this._modeDraft,
			[e]: t
		}, this._setModeDirty(!0);
	}
	_toggleModeProfile(e) {
		let t = this._modeDraft.profileIds.includes(e);
		this._modeDraft = {
			...this._modeDraft,
			profileIds: t ? this._modeDraft.profileIds.filter((t) => t !== e) : [...this._modeDraft.profileIds, e]
		}, this._setModeDirty(!0);
	}
	async _saveMode() {
		let e = this.hass ? new j(this.hass) : void 0;
		if (!(!e || this._busy || mu(this._modeDraft, this.data?.modes ?? [], this.data?.profiles ?? []))) {
			this._busy = "mode-save", this._clearNotices();
			try {
				let t = await e.setVelairMode({
					...this._modeDraft.key ? { key: this._modeDraft.key } : {},
					name: this._modeDraft.name.trim(),
					profile_ids: [...this._modeDraft.profileIds]
				});
				this._emitData(t);
				let n = this._modeDraft.key ?? t.mode_id, r = t.modes?.find((e) => e.key === n);
				r && (this._selectedModeKey = r.key, this._modeDraft = pu(r)), this._setModeDirty(!1), this._showSuccess(this._t("modeSaved"));
			} catch (e) {
				this._error = this._errorMessage(e, "modeUnableSave");
			} finally {
				this._busy = void 0;
			}
		}
	}
	async _deleteMode(e) {
		let t = this.hass ? new j(this.hass) : void 0;
		if (!(!t || this._busy || !window.confirm(this._t("modeConfirmDelete", { mode: e.name })))) {
			this._busy = "mode-delete", this._clearNotices();
			try {
				this._emitData(await t.deleteVelairMode(e.key)), e.key === this._selectedModeKey && this._clearModeSelection(), this._showSuccess(this._t("modeDeleted"));
			} catch (e) {
				this._error = this._errorMessage(e, "modeUnableDelete");
			} finally {
				this._busy = void 0;
			}
		}
	}
	async _activate(e) {
		let t = this.hass ? new j(this.hass) : void 0;
		if (!t || this._busy || this._operationRunning()) return;
		let n = this.data?.operation_status?.id;
		this._busy = "activate", this._clearNotices();
		try {
			this._emitData(await uu(t, e));
		} catch (e) {
			let t = this.data?.operation_status;
			t?.state === "failed" && t.id !== n || (this._error = this._errorMessage(e, "profileUnableActivate"));
		} finally {
			this._busy = void 0;
		}
	}
	async _selectActiveMode(e) {
		let t = this.hass ? new j(this.hass) : void 0;
		if (!t || this._busy || this._operationRunning()) return;
		let n = e === "default" ? { kind: "default" } : e === "manual" ? { kind: "manual" } : e.startsWith("custom:") && e.slice(7) ? {
			kind: "custom",
			key: e.slice(7)
		} : void 0;
		if (!n) return;
		let r = this.data?.operation_status?.id;
		this._busy = "mode-activate", this._clearNotices();
		try {
			this._emitData(await t.selectVelairMode(n));
		} catch (e) {
			let t = this.data?.operation_status;
			t?.state === "failed" && t.id !== r || (this._error = this._errorMessage(e, "modeUnableActivate"));
		} finally {
			this._busy = void 0;
		}
	}
	async _save() {
		let e = this.hass ? new j(this.hass) : void 0;
		if (!(!e || this._busy)) {
			this._busy = "save", this._clearNotices();
			try {
				let t = await cu(e, this._draft);
				this._emitData(t);
				let n = t.profiles?.find((e) => e.key === (this._draft.key ?? t.profile_id)) ?? t.profiles?.find((e) => e.name === this._draft.name.trim());
				n && (this._selectedKey = n.key, this._draft = H(n), this._selectedDays = {}, this._cloneDayTargets = {}), this._setDirty(!1), this._showSuccess(this._t("profileSaved"));
			} catch (e) {
				this._error = e instanceof Error && e.message === "name" ? this._t("profileNameRequired") : e instanceof Error && e.message === "icon" ? this._t("profileInvalidIcon") : e instanceof Error && e.message === "color" ? this._t("profileInvalidColor") : e instanceof Error && e.message === "description" ? this._t("profileDescriptionTooLong", { count: 500 }) : this._errorMessage(e, "profileInvalidSchedule");
			} finally {
				this._busy = void 0;
			}
		}
	}
	async _deleteProfile(e) {
		let t = this.hass ? new j(this.hass) : void 0;
		if (!t || this._busy) return;
		let n = this.data?.global.active_profile_ids?.includes(e.key) ?? !1;
		if (window.confirm(this._t(n ? "profileConfirmDeleteActive" : "profileConfirmDelete", { profile: e.name }))) {
			this._busy = "delete", this._clearNotices();
			try {
				this._emitData(await lu(t, e.key)), e.key === this._selectedKey && this._clearSelection(), this._showSuccess(this._t("profileDeleted"));
			} catch (e) {
				this._error = this._errorMessage(e, "profileUnableDelete");
			} finally {
				this._busy = void 0;
			}
		}
	}
	_emitData(e) {
		this.data = e, this.dispatchEvent(new CustomEvent("profile-data-changed", {
			bubbles: !0,
			composed: !0,
			detail: e
		}));
	}
	_operationRunning() {
		return this.data?.operation_status?.state === "running";
	}
	_showSuccess(e) {
		this.dispatchEvent(new CustomEvent("profile-success", {
			bubbles: !0,
			composed: !0,
			detail: e
		}));
	}
	_clearNotices() {
		this._error = void 0;
	}
	_setDirty(e) {
		this._dirty !== e && (this._dirty = e, this._emitDirtyState());
	}
	_setModeDirty(e) {
		this._modeDirty !== e && (this._modeDirty = e, this._emitDirtyState());
	}
	_emitDirtyState() {
		this.dispatchEvent(new CustomEvent("profile-dirty-changed", {
			bubbles: !0,
			composed: !0,
			detail: this._dirty || this._modeDirty
		}));
	}
	_errorMessage(e, t) {
		return e instanceof Error && e.message && e.message !== "schedule" ? e.message : this._t(t);
	}
	_t(e, t = {}) {
		return ht(k(this.hass), e, t);
	}
	static {
		this.styles = [xn, gu];
	}
};
Y([T({ attribute: !1 })], X.prototype, "hass", void 0), Y([T({ attribute: !1 })], X.prototype, "data", void 0), Y([T({ type: Boolean })], X.prototype, "compact", void 0), Y([T({ attribute: "active-setup-controls" })], X.prototype, "activeSetupControls", void 0), Y([E()], X.prototype, "_selectedKey", void 0), Y([E()], X.prototype, "_draft", void 0), Y([E()], X.prototype, "_selectedDays", void 0), Y([E()], X.prototype, "_cloneDayTargets", void 0), Y([E()], X.prototype, "_busy", void 0), Y([E()], X.prototype, "_dirty", void 0), Y([E()], X.prototype, "_error", void 0), Y([E()], X.prototype, "_expandedZones", void 0), Y([E()], X.prototype, "_selectedModeKey", void 0), Y([E()], X.prototype, "_modeEditorOpen", void 0), Y([E()], X.prototype, "_modeDraft", void 0), Y([E()], X.prototype, "_modeDirty", void 0), Y([E()], X.prototype, "_activeLibrary", void 0), customElements.get("velair-profiles-view") || customElements.define("velair-profiles-view", X);
//#endregion
//#region src/velair/views/card-content.ts
function _u(e) {
	let t = e._effectiveView(), n = !e._hasExternalConfig || t === "active-setup", r = e._orderedZoneIds(e._data?.configured_entities ?? []), i = e._visibleZoneIds(e._data?.configured_entities ?? []), a = e._selectedEntity && i.includes(e._selectedEntity) ? e._selectedEntity : i[0], o = a ? e._data?.zones[a] : void 0, s = e._data && !e._data.temperature_migration.required ? so(e._data.zones, (t) => e._entityTemperatureLimits(t), (t) => e._entityTemperatureStep(t)) : 0;
	return y`
    <ha-card>
      <div
        class=${e._schedulerMenuOpen ? "card scheduler-dialog-open" : "card"}
        data-view=${t}
      >
        ${e._schedulerMenuOpen ? y`<button class="card-scrim" type="button" @click=${e._closeSchedulerMenu}></button>` : x}

        ${n && e._data?.operation_status && po(e._data.operation_status, e._dismissedOperationId) ? mo(e, e._data.operation_status) : x}
        ${e._error ? co(e, "error", e._error) : x}
        ${e._saveMessage ? co(e, "success", e._saveMessage) : x}
        ${e._loading && !e._data ? y`<div class="notice">${e._t("loading")}</div>` : x}
        ${e._data?.temperature_migration?.required ? y`
              <div class="temperature-migration-banner" role="alert">
                <ha-icon icon="mdi:thermometer-alert"></ha-icon>
                <div>
                  <strong>${e._t("temperatureMigrationRequired")}</strong>
                  <span>${e._t(e._data?.temperature_migration?.reason === "legacy_celsius_upgrade_reset_required" ? "temperatureLegacyResetStopped" : "temperatureMigrationStopped")}</span>
                </div>
              </div>
            ` : x}
        ${e._data?.operation_recovery ? y`
              <div class="temperature-migration-banner" role="alert">
                <ha-icon icon="mdi:database-alert"></ha-icon>
                <div>
                  <strong>${e._t("operationRecoveryRequired")}</strong>
                  <span>${e._t("operationRecoveryDescription")}</span>
                </div>
              </div>
            ` : x}
        ${s ? y`
              <div class="temperature-migration-banner" role="alert">
                <ha-icon icon="mdi:calendar-alert"></ha-icon>
                <div>
                  <strong>${e._t("incompatibleScheduleTargets")}</strong>
                  <span>${e._t("incompatibleScheduleTargetsDescription", { count: s })}</span>
                </div>
              </div>
            ` : x}

        ${e._data ? vu(e, t, r, i, a, o) : x}
      </div>
    </ha-card>
  `;
}
function vu(e, t, n, r, i, a) {
	return e._data?.temperature_migration?.required && t !== "settings" ? y`<div class="notice">${e._t(e._data.temperature_migration.reason === "legacy_celsius_upgrade_reset_required" ? "temperatureLegacyResetStopped" : "temperatureMigrationStopped")}</div>` : t === "overview" ? y`
      ${Ds(e, n)}
      ${yu(e)}
      ${Os(e, r)}
      ${ic(e, r)}
      ${Gs(e, r)}
      ${As(e, r)}
    ` : t === "profiles" ? y`<velair-profiles-view
      .hass=${e.hass}
      .data=${e._data}
      @profile-data-changed=${(t) => e._applyScheduleData(t.detail, { forceDraft: !1 })}
      @profile-success=${(t) => e._showSuccess(t.detail)}
    ></velair-profiles-view>` : t === "overview-status" ? Ds(e, n) : t === "active-setup" ? yu(e) : t === "overview-boosts" ? Os(e, r) : t === "overview-events" ? ic(e, r) : t === "overview-timeline" ? Gs(e, r) : t === "overview-zones" ? As(e, r) : t === "schedules" ? Vc(e, r, i, a) : t === "templates" ? ou(e, i) : t === "sensors" ? vl(e, r, Su(e)) : t === "comfort" ? Oo(e, r, xu(e)) : t === "preconditioning" ? hc(e, r) : t === "settings" ? $l(e, r) : Ds(e, n);
}
function yu(e) {
	return y`<velair-profiles-view
    compact
    .activeSetupControls=${bu(e._config?.active_setup_controls)}
    .hass=${e.hass}
    .data=${e._data}
    @profile-data-changed=${(t) => e._applyScheduleData(t.detail, { forceDraft: !1 })}
    @profile-success=${(t) => e._showSuccess(t.detail)}
  ></velair-profiles-view>`;
}
function bu(e) {
	return e === "modes" || e === "profiles" ? e : "both";
}
function xu(e) {
	return {
		showCo2: e._config.show_comfort_co2 !== !1,
		showConfiguration: e._config.show_comfort_configuration !== !1,
		showHumidity: e._config.show_comfort_humidity !== !1,
		showTemperature: e._config.show_comfort_temperature !== !1
	};
}
function Su(e) {
	return {
		showAssistSwitch: e._config.show_room_assist_switch !== !1,
		showDebounce: e._config.show_room_assist_debounce !== !1,
		showLiveStatus: e._config.show_room_assist_live_status !== !1,
		showMaxDelta: e._config.show_room_assist_max_delta !== !1,
		showRoomSensor: e._config.show_room_assist_sensor !== !1
	};
}
//#endregion
//#region src/velair/components/velair-card-element.ts
var Z = class extends w {
	constructor(...e) {
		super(...e), this.view = "overview-status", this._config = {}, this._changedNextEventIds = /* @__PURE__ */ new Set(), this._loading = !1, this._saving = !1, this._selectedWeekday = "monday", this._draftBlocks = [], this._dirty = !1, this._copyTargets = /* @__PURE__ */ new Set(), this._copying = !1, this._zoneTargets = /* @__PURE__ */ new Set(), this._applyingZones = !1, this._selectedTemplateKey = "", this._templateNameDraft = "", this._templateNameDraftKey = "", this._templateDraftBlocks = [], this._templateDraftKey = "", this._templateDirty = !1, this._templateApplyOpen = !1, this._templateApplyTargets = /* @__PURE__ */ new Set(), this._applyingTemplateTargets = !1, this._templateListCanScrollUp = !1, this._templateListCanScrollDown = !1, this._settingsSaving = !1, this._exportSections = new Set(nt), this._expandedComfortZones = /* @__PURE__ */ new Set(), this._expandedPreconditioningZones = /* @__PURE__ */ new Set(), this._importSections = /* @__PURE__ */ new Set(), this._importFileName = "", this._pauseDurationMinutes = 60, this._schedulerMenuOpen = !1, this._nextEventsOpen = !1, this._nextEventChangeRevision = 0, this._timelineNow = /* @__PURE__ */ new Date(), this._subscribing = !1, this._temperatureUnitReloadPending = !1, this._overviewTimelineScrollInitialized = !1, this._hasExternalConfig = !1, this._handleOperationStatusDismissed = (e) => {
			let t = e.detail;
			t === this._data?.operation_status?.id && (this._dismissedOperationId = t, this._clearOperationStatusTimer());
		}, this._handleTemplateListScroll = () => {
			this._syncTemplateListScrollIndicators();
		}, this._addBlock = (e = "schedule") => {
			Lr(F(this), e);
		}, this._applySelectedTemplate = () => eo(V(this)), this._pauseScheduler = async (e, t = {}) => {
			await pr(P(this), e, t);
		}, this._resumeScheduler = async (e = {}) => {
			await mr(P(this), e);
		}, this._handleSchedulerMenuToggle = (e) => {
			gr(P(this), e);
		}, this._toggleNextEvents = () => {
			_r(P(this));
		}, this._handleTimelineDragOver = (e) => {
			Si(e);
		}, this._handleTimelineDragEnd = () => {
			Ti(R(this));
		}, this._handleTimelineResizeMove = (e) => {
			Di(R(this), e);
		}, this._handleTimelineResizeEnd = () => {
			Oi(R(this));
		}, this._handleSettingsZoneDragEnd = () => {
			yi(L(this));
		};
	}
	get hass() {
		return this._hass;
	}
	set hass(e) {
		let t = this._hass, n = t?.config?.unit_system?.temperature !== e?.config?.unit_system?.temperature, r = Xt(A(this), e, t);
		this._hass = e, this._shouldUpdateForHass(e, t) && this.requestUpdate("hass", t), r && this._schedulePreconditioningRefresh(), n && t && this._data && (this._temperatureUnitReloadPending = !0, this._loadSchedule());
	}
	_api() {
		return this.hass ? new j(this.hass) : void 0;
	}
	setConfig(e) {
		this._hasExternalConfig = !0;
		let t = this._selectedEntity;
		if (this._config = e ?? {}, this._selectedEntity = e?.selected_entity, this._data) {
			let e = this._visibleZoneIds(this._data.configured_entities);
			(!this._selectedEntity || !e.includes(this._selectedEntity)) && (this._selectedEntity = e[0]);
		}
		this._selectedWeekday = this._firstWeekday(), this._selectedEntity !== t && this._resetDraftBlocks();
	}
	connectedCallback() {
		super.connectedCallback(), this._loadSchedule(), this._subscribeUpdates(), this._syncTimelineNowTick(), window.addEventListener(lo, this._handleOperationStatusDismissed);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._unsubscribeUpdates &&= (this._unsubscribeUpdates(), void 0), this._clearSuccessNoticeTimer(), this._clearOperationStatusTimer(), this._clearNextEventChangeTimer(), this._clearPreconditioningRefreshTimer(), this._clearOverviewTimelineDetail(), this._stopPauseTick(), this._stopTimelineNowTick(), window.removeEventListener(lo, this._handleOperationStatusDismissed);
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
		e.has("hass") && this.hass && !this._data && !this._loading && this._loadSchedule(), e.has("hass") && this.hass && this._subscribeUpdates(), e.has("_saveMessage") && !this._saveMessage && this._clearSuccessNoticeTimer(), e.has("_data") && this._syncOperationStatusTimer(), this._effectiveView() === "templates" && (e.has("view") || e.has("_data") || e.has("_selectedTemplateKey") || e.has("_templateListCanScrollUp") || e.has("_templateListCanScrollDown")) && window.requestAnimationFrame(() => this._syncTemplateListScrollIndicators()), (e.has("view") || e.has("_data")) && this._syncTimelineNowTick();
		let t = this._effectiveView();
		t === "overview" || t === "overview-timeline" ? this._data && !this._overviewTimelineScrollInitialized && (this._overviewTimelineScrollInitialized = !0, window.requestAnimationFrame(() => this._scrollOverviewTimelineToNow())) : this._overviewTimelineScrollInitialized = !1;
	}
	render() {
		return _u(ao(this));
	}
	_dismissOperationStatus() {
		let e = this._data?.operation_status?.id;
		e && fo(e);
	}
	_syncOperationStatusTimer() {
		this._clearOperationStatusTimer();
		let e = this._data?.operation_status;
		if (!e || e.state === "running") {
			e?.id !== this._dismissedOperationId && (this._dismissedOperationId = void 0);
			return;
		}
		if (e.state !== "completed" || !e.finished_at) return;
		let t = Date.parse(e.finished_at), n = Number.isFinite(t) ? $e - (Date.now() - t) : $e;
		if (n <= 0) {
			this._dismissedOperationId = e.id;
			return;
		}
		this._operationStatusTimeout = window.setTimeout(() => {
			this._data?.operation_status?.id === e.id && (this._dismissedOperationId = e.id), this._operationStatusTimeout = void 0;
		}, n);
	}
	_clearOperationStatusTimer() {
		this._operationStatusTimeout !== void 0 && (window.clearTimeout(this._operationStatusTimeout), this._operationStatusTimeout = void 0);
	}
	_effectiveView() {
		return Jt(this.getAttribute("view"), this.view, this._config.view);
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
	_scrollOverviewTimelineToNow() {
		let e = this.renderRoot.querySelector(".overview-timeline-scroll"), t = e?.querySelector(".overview-timeline-names");
		!e || !t || e.scrollWidth <= e.clientWidth + 1 || (e.scrollLeft = Qn(Zn(this._currentTimelineNow()).left, e.scrollWidth, e.clientWidth, t.offsetWidth));
	}
	_showOverviewTimelineDetail(e, t, n, r) {
		window.matchMedia("(hover: none), (pointer: coarse)").matches && (r.preventDefault(), r.stopPropagation(), this._overviewTimelineDetail = t, this._overviewTimelineDetailAnchor = Math.max(0, Math.min(100, n)), this._overviewTimelineDetailEntityId = e);
	}
	_clearOverviewTimelineDetail() {
		this._overviewTimelineDetail = void 0, this._overviewTimelineDetailAnchor = void 0, this._overviewTimelineDetailEntityId = void 0;
	}
	_isCardView(e) {
		return qt(e);
	}
	_shouldUpdateForHass(e, t) {
		return Yt(A(this), e, t);
	}
	_canResumeScheduler() {
		return fr(P(this));
	}
	_selectTemplate(e) {
		za(V(this), e);
	}
	_selectScheduleTemplate(e) {
		Ba(V(this), e);
	}
	_resetTemplateDraft(e) {
		Va(V(this), e);
	}
	_templateListClass(e) {
		return Ha(V(this), e);
	}
	_syncTemplateListScrollIndicators() {
		Ua(V(this));
	}
	_setTemplateListScrollIndicators(e, t) {
		Wa(V(this), e, t);
	}
	_templateNameInputValue(e) {
		return Ga(V(this), e);
	}
	_updateTemplateNameDraft(e, t) {
		Ka(V(this), e, t);
	}
	async _createTemplate() {
		await qa(V(this));
	}
	async _saveSelectedTemplateFromLibrary(e) {
		await Ja(V(this), e);
	}
	_uniqueTemplateName(e) {
		return Ya(V(this), e);
	}
	_scheduleTemplates() {
		return Vn(this._data?.templates, this._temperatureUnit());
	}
	_templateLabel(e) {
		return Hn(e);
	}
	async _loadSchedule() {
		if (!this._loading) do
			this._temperatureUnitReloadPending = !1, await Ui(z(this));
		while (this._temperatureUnitReloadPending);
	}
	async _subscribeUpdates() {
		await Wi(z(this));
	}
	_applyScheduleData(e, t = {}) {
		let n = Nn(this._data?.next_events ?? [], e.next_events);
		Gi(z(this), e, t), this._markChangedNextEvents(n);
	}
	_schedulePreconditioningRefresh() {
		this._preconditioningRefreshTimer !== void 0 || !this.isConnected || (this._preconditioningRefreshTimer = window.setTimeout(() => {
			this._preconditioningRefreshTimer = void 0, this._loadSchedule();
		}, 1200));
	}
	_clearPreconditioningRefreshTimer() {
		this._preconditioningRefreshTimer !== void 0 && (window.clearTimeout(this._preconditioningRefreshTimer), this._preconditioningRefreshTimer = void 0);
	}
	_markChangedNextEvents(e) {
		e.length && (this._clearNextEventChangeTimer(!1), this._changedNextEventIds = new Set(e), this._nextEventChangeRevision += 1, this._nextEventChangeTimeout = window.setTimeout(() => {
			this._nextEventChangeTimeout = void 0, this._changedNextEventIds = /* @__PURE__ */ new Set();
		}, 2200));
	}
	_clearNextEventChangeTimer(e = !0) {
		this._nextEventChangeTimeout !== void 0 && (window.clearTimeout(this._nextEventChangeTimeout), this._nextEventChangeTimeout = void 0), e && this._changedNextEventIds.size && (this._changedNextEventIds = /* @__PURE__ */ new Set());
	}
	_resetDraftBlocks() {
		Ki(z(this));
	}
	_selectEntity(e) {
		qi(z(this), e);
	}
	_selectWeekday(e) {
		Ji(z(this), e);
	}
	_blocksForSource(e) {
		return Yi(z(this), e);
	}
	_setBlocksForSource(e, t) {
		Xi(z(this), e, t);
	}
	_markBlocksDirty(e) {
		Zi(z(this), e);
	}
	_toggleTemplateApplyPanel() {
		Xa(V(this));
	}
	_templateApplyTargetKey(e, t) {
		return Za(e, t);
	}
	_toggleTemplateApplyTarget(e, t, n) {
		Qa(V(this), e, t, n);
	}
	async _applyTemplateToTargets(e) {
		await $a(V(this), e);
	}
	async _saveTemplate(e) {
		await no(V(this), e);
	}
	_newTemplateKey() {
		return ro();
	}
	async _deleteSelectedTemplate() {
		await io(V(this));
	}
	_closeSchedulerMenu() {
		hr(P(this));
	}
	_removeBlock(e, t = "schedule") {
		Rr(F(this), e, t);
	}
	_updateDraftBlock(e, t, n, r = "schedule") {
		zr(F(this), e, t, n, r);
	}
	_markDirty() {
		Br(F(this));
	}
	_handleTimelineDragStart(e, t, n) {
		xi(R(this), e, t, n);
	}
	_handleTimelineDrop(e, t = "schedule") {
		Ci(R(this), e, t);
	}
	_handleTimelineResizeStart(e, t, n, r) {
		Ei(R(this), e, t, n, r);
	}
	_resizeTimelineBlock(e, t, n, r = "schedule") {
		ki(R(this), e, t, n, r);
	}
	_setDraftBlockStart(e, t, n = {}, r = "schedule") {
		Vr(F(this), e, t, n, r);
	}
	_sortDraftBlocksByStart(e = "schedule") {
		Ai(R(this), e);
	}
	_toggleCopyTarget(e, t) {
		Hr(F(this), e, t);
	}
	_toggleZoneTarget(e, t) {
		Ur(F(this), e, t);
	}
	_dismissNotice(e) {
		wr(Cr(this), e);
	}
	_showSuccess(e) {
		Tr(Cr(this), e);
	}
	_successNoticeProgress() {
		return Er(Cr(this));
	}
	_clearSuccessNoticeTimer(e = !0) {
		Dr(Cr(this), e);
	}
	_hasDraftValidationError(e = "schedule") {
		return Gr(Wr(this), e);
	}
	_temperatureError(e, t = "schedule") {
		return Kr(Wr(this), e, t);
	}
	async _saveSelectedDay() {
		await Li(Ii(this));
	}
	async _copySelectedDay() {
		await Ri(Ii(this));
	}
	async _applySelectedDayToZones() {
		await zi(Ii(this));
	}
	_normalizeDraftBlocks(e = "schedule") {
		return Bi(Ii(this), e);
	}
	_clampBlocksForEntity(e, t) {
		return Vi(Ii(this), e, t);
	}
	_unsupportedModeError(e, t) {
		return Hi(Ii(this), e, t);
	}
	_pauseExpirationMs() {
		return vr(P(this));
	}
	_pauseProgressPercent(e) {
		return yr(P(this), e);
	}
	_syncPauseTick() {
		br(P(this));
	}
	_nextCountdownExpirationMs() {
		return xr(P(this));
	}
	_stopPauseTick() {
		Sr(P(this));
	}
	_timelineBlocks(e = "schedule") {
		return ji(R(this), e);
	}
	_inputValue(e) {
		return Kt(e);
	}
	_t(e, t = {}) {
		return en(A(this), e, t);
	}
	_language() {
		return $t(A(this));
	}
	_weekdayName(e) {
		return tn(A(this), e);
	}
	_shortWeekdayName(e) {
		return nn(A(this), e);
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
		return rn(A(this), e, t);
	}
	_firstWeekday() {
		return an(A(this));
	}
	_orderedWeekdays() {
		return on(A(this));
	}
	_orderedZoneIds(e) {
		return sn(A(this), e);
	}
	_visibleZoneIds(e) {
		return cn(A(this), e);
	}
	async _updateSettingsFirstWeekday(e) {
		await li(L(this), e);
	}
	async _saveSettings(e) {
		await ui(L(this), e);
	}
	async _saveZonePreconditioning(e, t) {
		await di(L(this), e, t);
	}
	async _resolveTemperatureMigration(e) {
		let t = this._api(), n = this._data?.temperature_migration;
		if (!t || this._temperatureMigrationAction || !n?.required) return;
		let r = n.target_unit ?? this._temperatureUnit();
		if (window.confirm(this._t("temperatureMigrationConfirm", {
			source: e,
			target: r
		}))) {
			this._temperatureMigrationAction = e, this._error = void 0;
			try {
				let r = globalThis.crypto?.randomUUID?.() ?? `velair-${Date.now()}-${Math.random().toString(16).slice(2)}`;
				this._applyScheduleData(await t.resolveTemperatureMigration(e, r, n.temperature_revision ?? 0), { forceDraft: !0 }), Tr(Cr(this), this._t("temperatureMigrationComplete"));
			} catch (e) {
				this._error = e instanceof Error ? e.message : this._t("temperatureMigrationFailed");
			} finally {
				this._temperatureMigrationAction = void 0;
			}
		}
	}
	async _saveZoneComfort(e, t) {
		await fi(L(this), e, t);
	}
	_togglePreconditioningZone(e) {
		let t = new Set(this._expandedPreconditioningZones);
		t.has(e) ? t.delete(e) : t.add(e), this._expandedPreconditioningZones = t;
	}
	_toggleComfortZone(e) {
		let t = new Set(this._expandedComfortZones);
		t.has(e) ? t.delete(e) : t.add(e), this._expandedComfortZones = t;
	}
	async _resetZonePreconditioningLearning(e, t, n) {
		await pi(L(this), e, t, n);
	}
	async _resetZonePreconditioningSettings(e) {
		await mi(L(this), e);
	}
	_togglePortableSection(e, t, n) {
		Qr(I(this), e, t, n);
	}
	async _handlePortableImportFile(e) {
		await $r(I(this), e);
	}
	async _exportPortableData() {
		await ei(I(this));
	}
	async _importPortableData() {
		await ti(I(this));
	}
	async _resetVelairData() {
		await ni(I(this));
	}
	_importAvailableSections() {
		return ri(I(this));
	}
	_portableExportSummaryItems() {
		return ii(I(this));
	}
	_portableImportSummaryItems() {
		return ai(I(this));
	}
	_portableSummaryItem(e) {
		return oi(I(this), e);
	}
	_portableSectionLabel(e) {
		return si(I(this), e);
	}
	_downloadPortablePayload(e) {
		ci(e);
	}
	_moveSettingsZone(e, t) {
		hi(L(this), e, t);
	}
	_handleSettingsZoneDragStart(e, t) {
		gi(L(this), e, t);
	}
	_handleSettingsZoneDragOver(e) {
		_i(e);
	}
	_handleSettingsZoneDrop(e, t) {
		vi(L(this), e, t);
	}
	_updateSettingsZoneOrder(e) {
		bi(L(this), e);
	}
	_temperatureLimits(e = "schedule", t = this._selectedEntity) {
		return ca(B(this), e, t);
	}
	_entityTemperatureLimits(e) {
		return la(B(this), e);
	}
	_templateTemperatureLimits() {
		return ua(B(this));
	}
	_temperatureStep(e = "schedule", t = this._selectedEntity) {
		return da(B(this), e, t);
	}
	_entityTemperatureStep(e) {
		return fa(B(this), e);
	}
	_formatTemperatureLimit(e) {
		return Wt(e);
	}
	_entityExists(e) {
		return pa(B(this), e);
	}
	_entityFanModeOptions(e) {
		return va(B(this), e);
	}
	_entityPresetModeOptions(e) {
		return ba(B(this), e);
	}
	_entitySwingModeOptions(e) {
		return Sa(B(this), e);
	}
	_entitySwingHorizontalModeOptions(e) {
		return wa(B(this), e);
	}
	_entityHumidityLimits(e) {
		return Ea(B(this), e);
	}
	_friendlyEntityName(e) {
		return ma(B(this), e);
	}
	_climateSupportedModes(e) {
		return ha(B(this), e);
	}
	_hvacModeOptions(e = "schedule") {
		return ga(B(this), e);
	}
	_fanModeOptions(e = "schedule") {
		return _a(B(this), e);
	}
	_presetModeOptions(e = "schedule") {
		return ya(B(this), e);
	}
	_swingModeOptions(e = "schedule") {
		return xa(B(this), e);
	}
	_swingHorizontalModeOptions(e = "schedule") {
		return Ca(B(this), e);
	}
	_humidityLimits(e = "schedule") {
		return Ta(B(this), e);
	}
	_uniqueModes(e) {
		return Da(e);
	}
	_entityDiagnostic(e) {
		return ka(B(this), e);
	}
	_climateProvidedData(e) {
		return Aa(B(this), e);
	}
	_formatDateTime(e) {
		return ja(B(this), e);
	}
	_formatScheduleTime(e) {
		return Ma(B(this), e);
	}
	_dateLocale() {
		return Na(B(this));
	}
	_formatRemaining(e) {
		return ra(e);
	}
	_formatTemperature(e, t) {
		return Pa(B(this), e, t);
	}
	_formatEventAction(e) {
		return Fa(B(this), e);
	}
	_formatEventMode(e) {
		return Ia(B(this), e);
	}
	_temperatureUnit(e) {
		return La(B(this), e);
	}
	static {
		this.styles = xn;
	}
};
Y([T({ type: String })], Z.prototype, "view", void 0), Y([E()], Z.prototype, "_config", void 0), Y([E()], Z.prototype, "_changedNextEventIds", void 0), Y([E()], Z.prototype, "_data", void 0), Y([E()], Z.prototype, "_error", void 0), Y([E()], Z.prototype, "_loading", void 0), Y([E()], Z.prototype, "_saving", void 0), Y([E()], Z.prototype, "_saveMessage", void 0), Y([E()], Z.prototype, "_selectedEntity", void 0), Y([E()], Z.prototype, "_selectedWeekday", void 0), Y([E()], Z.prototype, "_draftBlocks", void 0), Y([E()], Z.prototype, "_dirty", void 0), Y([E()], Z.prototype, "_dismissedOperationId", void 0), Y([E()], Z.prototype, "_dirtyEntityId", void 0), Y([E()], Z.prototype, "_copyTargets", void 0), Y([E()], Z.prototype, "_copying", void 0), Y([E()], Z.prototype, "_zoneTargets", void 0), Y([E()], Z.prototype, "_applyingZones", void 0), Y([E()], Z.prototype, "_selectedTemplateKey", void 0), Y([E()], Z.prototype, "_templateNameDraft", void 0), Y([E()], Z.prototype, "_templateNameDraftKey", void 0), Y([E()], Z.prototype, "_templateDraftBlocks", void 0), Y([E()], Z.prototype, "_templateDraftKey", void 0), Y([E()], Z.prototype, "_templateDirty", void 0), Y([E()], Z.prototype, "_templateApplyOpen", void 0), Y([E()], Z.prototype, "_templateApplyTargets", void 0), Y([E()], Z.prototype, "_applyingTemplateTargets", void 0), Y([E()], Z.prototype, "_templateListCanScrollUp", void 0), Y([E()], Z.prototype, "_templateListCanScrollDown", void 0), Y([E()], Z.prototype, "_templateAction", void 0), Y([E()], Z.prototype, "_settingsSaving", void 0), Y([E()], Z.prototype, "_temperatureMigrationAction", void 0), Y([E()], Z.prototype, "_maintenanceAction", void 0), Y([E()], Z.prototype, "_portabilityAction", void 0), Y([E()], Z.prototype, "_exportSections", void 0), Y([E()], Z.prototype, "_expandedComfortZones", void 0), Y([E()], Z.prototype, "_expandedPreconditioningZones", void 0), Y([E()], Z.prototype, "_importSections", void 0), Y([E()], Z.prototype, "_importPayload", void 0), Y([E()], Z.prototype, "_importFileName", void 0), Y([E()], Z.prototype, "_pauseDurationMinutes", void 0), Y([E()], Z.prototype, "_controlAction", void 0), Y([E()], Z.prototype, "_schedulerMenuOpen", void 0), Y([E()], Z.prototype, "_nextEventsOpen", void 0), Y([E()], Z.prototype, "_nextEventChangeRevision", void 0), Y([E()], Z.prototype, "_overviewTimelineDetail", void 0), Y([E()], Z.prototype, "_overviewTimelineDetailAnchor", void 0), Y([E()], Z.prototype, "_overviewTimelineDetailEntityId", void 0), Y([E()], Z.prototype, "_successNoticeStartedAt", void 0), Y([E()], Z.prototype, "_timelineNow", void 0);
//#endregion
//#region src/velair/registration.ts
function Cu(e) {
	Object.entries(e.elements).forEach(([e, t]) => {
		customElements.get(e) || customElements.define(e, t);
	}), window.velairFrontendBuild = e.build, window.velairFrontendVersion = e.version || void 0, window.customCards = window.customCards ?? [], window.customCards.some((t) => t.type === e.customCard.type) || window.customCards.push(e.customCard);
}
//#endregion
//#region src/velair/views/card-editor.ts
var wu = new Set(["schedules"]), Tu = new Set(["active-setup"]), Eu = new Set([
	"comfort",
	"overview",
	"overview-boosts",
	"overview-events",
	"overview-timeline",
	"overview-zones",
	"schedules",
	"templates",
	"sensors",
	"preconditioning",
	"settings"
]), Du = new Set(["comfort"]), Ou = [
	["show_comfort_configuration", "comfortCardShowConfiguration"],
	["show_comfort_temperature", "comfortCardShowTemperature"],
	["show_comfort_humidity", "comfortCardShowHumidity"],
	["show_comfort_co2", "comfortCardShowCo2"]
], ku = new Set(["sensors"]), Au = [
	["show_room_assist_switch", "roomAssistShowSwitch"],
	["show_room_assist_sensor", "roomAssistShowSensor"],
	["show_room_assist_max_delta", "roomAssistShowMaxDelta"],
	["show_room_assist_debounce", "roomAssistShowDebounce"],
	["show_room_assist_live_status", "roomAssistShowLiveStatus"]
], Q = class extends w {
	constructor(...e) {
		super(...e), this._config = {}, this._entities = [], this._loading = !1, this._loaded = !1, this._handleZoneDragEnd = () => {
			this._draggedEntity = void 0;
		};
	}
	setConfig(e) {
		this._config = e ?? {};
	}
	updated(e) {
		(e.has("hass") || e.has("_config")) && this.hass && this._showsThermostatOptions() && !this._loaded && !this._loading && this._loadManagedEntities();
	}
	render() {
		let e = this._firstWeekday(), t = this._showsActiveSetupControls(), n = this._orderedEntities(), r = this._showsFirstWeekdayOption(), i = this._showsComfortVisibilityOptions(), a = this._showsThermostatOptions(), o = this._showsRoomAssistVisibilityOptions();
		return y`
      <div class="editor">
        ${this._error ? y`<div class="notice error">${this._error}</div>` : x}
        ${this._loading ? y`<div class="notice">${this._t("loadingEntities")}</div>` : x}

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
            ${tt.map((e) => y`
              <option
                value=${e}
                ?selected=${e === (this._config.view ?? "overview-status")}
              >
                ${this._viewLabel(e)}
              </option>
            `)}
          </select>
        </label>

        ${t ? y`
              <label class="active-setup-controls-option">
                <span>${this._t("activeSetupCardControls")}</span>
                <select
                  .value=${this._activeSetupControls()}
                  @change=${(e) => this._updateActiveSetupControls(this._inputValue(e))}
                >
                  <option value="both">${this._t("activeSetupCardControlsBoth")}</option>
                  <option value="modes">${this._t("activeSetupCardControlsModes")}</option>
                  <option value="profiles">${this._t("activeSetupCardControlsProfiles")}</option>
                </select>
                <small>${this._t("activeSetupCardControlsDescription")}</small>
              </label>
            ` : x}

        ${r ? y`
              <label class="first-weekday-option">
                <span>${this._t("firstWeekday")}</span>
                <select
                  .value=${e}
                  @change=${(e) => this._updateFirstWeekday(this._inputValue(e))}
                >
                  ${D.map((e) => y`<option value=${e}>${this._weekdayName(e)}</option>`)}
                </select>
              </label>
            ` : x}

        ${a ? y`
              <section class="zone-order">
                <div>
                  <span class="section-label">${this._t("cardThermostats")}</span>
                  <p>${this._t("cardThermostatsDescription")}</p>
                </div>
                <div class="zone-list">
                  ${n.length ? n.map((e, t) => this._renderZoneOrderRow(e, t, n.length)) : y`<span class="empty">${this._t("noManagedEntities")}</span>`}
                </div>
              </section>
            ` : x}

        ${i ? y`
              <section class="card-visibility-options">
                <div>
                  <span class="section-label">${this._t("comfortCardVisibility")}</span>
                  <p>${this._t("comfortCardVisibilityDescription")}</p>
                </div>
                <div class="visibility-list">
                  ${Ou.map(([e, t]) => this._renderVisibilityOption(e, t))}
                </div>
              </section>
            ` : x}

        ${o ? y`
              <section class="card-visibility-options">
                <div>
                  <span class="section-label">${this._t("roomAssistCardVisibility")}</span>
                  <p>${this._t("roomAssistCardVisibilityDescription")}</p>
                </div>
                <div class="visibility-list">
                  ${Au.map(([e, t]) => this._renderVisibilityOption(e, t))}
                </div>
              </section>
            ` : x}
      </div>
    `;
	}
	_renderVisibilityOption(e, t) {
		return y`
      <label class="visibility-option">
        <input
          type="checkbox"
          .checked=${this._config[e] !== !1}
          @change=${(t) => this._toggleBooleanConfig(e, !!t.currentTarget.checked)}
        />
        <span>${this._t(t)}</span>
      </label>
    `;
	}
	_renderZoneOrderRow(e, t, n) {
		let r = this._selectedEntities().includes(e);
		return y`
      <div
        class="zone-row"
        draggable="true"
        @dragstart=${(t) => this._handleZoneDragStart(e, t)}
        @dragover=${(e) => this._handleZoneDragOver(e)}
        @drop=${(t) => this._handleZoneDrop(e, t)}
        @dragend=${this._handleZoneDragEnd}
      >
        <ha-icon icon="mdi:drag"></ha-icon>
        <label
          class="zone-visibility"
          title=${this._t(r ? "cardThermostatVisible" : "cardThermostatHidden")}
          @click=${(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            .checked=${r}
            ?disabled=${r && this._selectedEntities().length <= 1}
            @change=${(t) => this._toggleEntityVisibility(e, !!t.currentTarget.checked)}
          />
        </label>
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
	_selectedEntities() {
		let e = this._orderedEntities(), t = this._config.entities?.filter((t) => e.includes(t)) ?? [];
		return t.length ? t : e;
	}
	_updateConfig(e, t) {
		let n = { ...this._config }, r = t.trim();
		r ? n[e] = r : delete n[e], this._emitConfig(n);
	}
	_updateFirstWeekday(e) {
		let t = { ...this._config };
		t.first_weekday = D.includes(e) ? e : "monday", delete t.selected_weekday, this._emitConfig(t);
	}
	_updateActiveSetupControls(e) {
		let t = { ...this._config };
		e === "modes" || e === "profiles" ? t.active_setup_controls = e : delete t.active_setup_controls, this._emitConfig(t);
	}
	_activeSetupControls() {
		let e = this._config.active_setup_controls;
		return e === "modes" || e === "profiles" ? e : "both";
	}
	_toggleBooleanConfig(e, t) {
		let n = { ...this._config };
		t ? delete n[e] : n[e] = !1, this._emitConfig(n);
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
	_toggleEntityVisibility(e, t) {
		let n = this._orderedEntities(), r = new Set(this._selectedEntities());
		t ? r.add(e) : r.size > 1 && r.delete(e);
		let i = n.filter((e) => r.has(e)), a = { ...this._config };
		i.length === n.length ? delete a.entities : a.entities = i, a.selected_entity && !i.includes(a.selected_entity) && delete a.selected_entity, this._emitConfig(a);
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
		return ht(this._language(), e, t);
	}
	_updateView(e) {
		let t = { ...this._config };
		t.view = tt.includes(e) ? e : "overview-status", this._emitConfig(t);
	}
	_language() {
		return k(this.hass);
	}
	_firstWeekday() {
		let e = this._config.first_weekday ?? this._config.selected_weekday ?? "monday";
		return D.includes(e) ? e : "monday";
	}
	_weekdayName(e) {
		return gt(this._language(), e);
	}
	_viewLabel(e) {
		return this._t({
			overview: "overview",
			profiles: "profiles",
			"overview-status": "cardViewOverviewStatus",
			"overview-boosts": "cardViewOverviewBoosts",
			"overview-events": "cardViewOverviewEvents",
			"overview-timeline": "cardViewOverviewTimeline",
			"overview-zones": "cardViewOverviewZones",
			"active-setup": "cardViewActiveSetup",
			schedules: "cardViewSchedules",
			templates: "templates",
			sensors: "cardViewSensors",
			comfort: "cardViewComfort",
			preconditioning: "cardViewPreconditioning",
			settings: "settings"
		}[e]);
	}
	_selectedView() {
		let e = this._config.view;
		return e && tt.includes(e) ? e : "overview-status";
	}
	_showsFirstWeekdayOption() {
		return wu.has(this._selectedView());
	}
	_showsActiveSetupControls() {
		return Tu.has(this._selectedView());
	}
	_showsComfortVisibilityOptions() {
		return Du.has(this._selectedView());
	}
	_showsThermostatOptions() {
		return Eu.has(this._selectedView());
	}
	_showsRoomAssistVisibilityOptions() {
		return ku.has(this._selectedView());
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
    .zone-list,
    .card-visibility-options,
    .visibility-list {
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
      grid-template-columns: 24px 24px minmax(0, 1fr) auto;
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

    .zone-visibility {
      align-items: center;
      display: inline-flex;
      justify-content: center;
      margin: 0;
      min-height: 24px;
    }

    .zone-visibility input {
      cursor: pointer;
      height: 16px;
      margin: 0;
      min-height: 0;
      padding: 0;
      width: 16px;
    }

    .zone-visibility input:disabled {
      cursor: default;
    }

    .visibility-option {
      align-items: center;
      background: var(--secondary-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      display: grid;
      gap: 8px;
      grid-template-columns: 20px minmax(0, 1fr);
      margin: 0;
      min-height: 42px;
      padding: 8px;
    }

    .visibility-option input {
      cursor: pointer;
      height: 16px;
      margin: 0;
      min-height: 0;
      padding: 0;
      width: 16px;
    }

    .visibility-option span {
      color: var(--primary-text-color);
      font-size: 13px;
      margin: 0;
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
Y([T({ attribute: !1 })], Q.prototype, "hass", void 0), Y([E()], Q.prototype, "_config", void 0), Y([E()], Q.prototype, "_entities", void 0), Y([E()], Q.prototype, "_loading", void 0), Y([E()], Q.prototype, "_loaded", void 0), Y([E()], Q.prototype, "_error", void 0);
//#endregion
//#region src/velair/views/tabs.ts
var ju = [
	{
		icon: "mdi:view-dashboard-outline",
		labelKey: "overview",
		view: "overview"
	},
	{
		icon: "mdi:account-switch-outline",
		labelKey: "profiles",
		view: "profiles"
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
		icon: "mdi:home-thermometer-outline",
		labelKey: "sensors",
		view: "sensors"
	},
	{
		icon: "mdi:home-heart",
		labelKey: "comfort",
		view: "comfort"
	},
	{
		icon: "mdi:clock-fast",
		labelKey: "preconditioning",
		view: "preconditioning"
	},
	{
		icon: "mdi:cog-outline",
		labelKey: "settings",
		view: "settings"
	}
];
function Mu(e) {
	return ju.find((t) => t.view === e)?.icon ?? "mdi:circle";
}
//#endregion
//#region src/velair/views/panel.ts
var $ = class extends w {
	constructor(...e) {
		super(...e), this.narrow = !1, this._activeView = "overview", this._profileDirty = !1;
	}
	render() {
		return y`
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
            ${et.map((e) => y`
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
		return Bc(this._activeView, y`<velair-panel-card
        .hass=${this.hass}
        .view=${this._activeView}
        view=${this._activeView}
        @profile-dirty-changed=${(e) => {
			this._profileDirty = e.detail;
		}}
      ></velair-panel-card>`);
	}
	_handleTabClick(e, t) {
		t.preventDefault(), t.stopPropagation(), this._selectView(e, t);
	}
	_selectView(e, t) {
		et.includes(e) && (this._activeView === "profiles" && e !== "profiles" && this._profileDirty && !window.confirm(this._t("profileDiscardChanges")) || (e !== "profiles" && (this._profileDirty = !1), this._activeView = e, this._syncTabGroupActive(e, t)));
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
		return typeof e == "string" && et.includes(e);
	}
	_viewIcon(e) {
		return Mu(e);
	}
	_t(e, t = {}) {
		return ht(this._language(), e, t);
	}
	_language() {
		return k(this.hass);
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
      max-width: 100%;
      min-width: 0;
      position: sticky;
      top: 0;
      width: 100%;
      z-index: 30;
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
      max-width: 100%;
      min-width: 0;
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
      padding: 16px 24px 24px;
      width: 100%;
    }

    velair-panel-card {
      --velair-operation-sticky-top: 112px;
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
        padding-top: 16px;
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
        padding: 8px 8px 16px;
      }
    }
  `;
	}
};
Y([T({ attribute: !1 })], $.prototype, "hass", void 0), Y([T({ type: Boolean })], $.prototype, "narrow", void 0), Y([T({ attribute: !1 })], $.prototype, "panel", void 0), Y([T({ attribute: !1 })], $.prototype, "route", void 0), Y([E()], $.prototype, "_activeView", void 0), Y([E()], $.prototype, "_profileDirty", void 0), Cu({
	build: n,
	customCard: {
		type: "velair-card",
		name: "Velair",
		description: "Climate automation that adapts to your life."
	},
	elements: {
		"velair-card": Z,
		"velair-card-editor": Q,
		"velair-panel-card": class extends Z {},
		"velair-sidebar-panel": $
	},
	version: r
});
//#endregion
export { Z as VelairCard };

//# sourceMappingURL=velair-card.js.map