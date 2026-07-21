import { StateEffect } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { editorInfoField, TFile } from "obsidian";
import type { Tracker } from "./tracker";
import type { TraceTimeSettings } from "./settings";
import { formatTimestamp } from "./format";

/** 插件状态变化（索引加载/外部恢复完成）后触发标签重绘。 */
export const tracetimeRefreshEffect = StateEffect.define<null>();

function fileOf(view: EditorView): TFile | null {
	try {
		return view.state.field(editorInfoField, false)?.file ?? null;
	} catch {
		return null;
	}
}

interface Label {
	text: string;
	left: number;
	top: number;
}

/**
 * 编辑模式显示：overlay 作为滚动容器（.cm-scroller）的子元素，
 * 标签使用文档坐标定位——滚动由浏览器原生完成，标签天然跟随内容，
 * 不存在屏幕坐标重算导致的错位/不跟随问题。
 *
 * 横坐标统一为“文档内容区右边缘”，与具体行盒宽度无关，
 * 任务列表等特殊行也不会破坏对齐。只渲染 visibleRanges 内的块。
 */
export function createEditorExtension(tracker: Tracker, getSettings: () => TraceTimeSettings) {
	return ViewPlugin.fromClass(
		class {
			private overlay: HTMLElement;
			private destroyed = false;

			constructor(view: EditorView) {
				this.overlay = document.createElement("div");
				this.overlay.className = "tracetime-editor-overlay";
				view.scrollDOM.appendChild(this.overlay);
				this.scheduleRender(view);
			}

			update(u: ViewUpdate) {
				if (u.docChanged) {
					const file = fileOf(u.view);
					if (file) {
						// 逐 transaction 顺序应用，保证多 transaction 时索引连续一致
						for (const tr of u.transactions) {
							if (tr.docChanged) tracker.applyEdit(file.path, tr.state.doc, tr.changes);
						}
					}
				}
				const refreshed = u.transactions.some((tr) =>
					tr.effects.some((e) => e.is(tracetimeRefreshEffect))
				);
				if (u.docChanged || u.viewportChanged || u.geometryChanged || refreshed) {
					this.scheduleRender(u.view);
				}
			}

			destroy() {
				this.destroyed = true;
				this.overlay.remove();
			}

			private scheduleRender(view: EditorView) {
				// CM 更新周期内不允许直接读布局，必须走 measure 的 read/write 阶段
				view.requestMeasure({
					read: (v) => this.measureLabels(v),
					write: (labels) => {
						if (this.destroyed) return;
						this.overlay.textContent = "";
						for (const l of labels) {
							const label = document.createElement("div");
							label.className = "tracetime-editor-label";
							label.textContent = l.text;
							label.style.left = `${l.left}px`;
							label.style.top = `${l.top}px`;
							this.overlay.appendChild(label);
						}
					},
				});
			}

			private measureLabels(view: EditorView): Label[] {
				const file = fileOf(view);
				const st = file ? tracker.getState(file.path) : undefined;
				if (!st) return [];

				const doc = view.state.doc;
				// 文档坐标系原点：contentDOM 在 scroller 内的偏移
				// （inline title 等元素会把内容区往下推，offsetTop 自动覆盖）
				const originTop = view.contentDOM.offsetTop;
				// 统一基准：文档内容区右边缘（文档坐标，随行宽无关）
				const left = view.contentDOM.offsetLeft + view.contentDOM.offsetWidth;

				const labels: Label[] = [];
				for (const vr of view.visibleRanges) {
					for (const b of st.index.queryOverlapping(vr.from, vr.to)) {
						const block = view.lineBlockAt(Math.min(b.from, doc.length));
						labels.push({
							text: formatTimestamp(b.modifiedAt, getSettings()),
							left,
							top: originTop + block.top + block.height / 2,
						});
					}
				}
				return labels;
			}
		}
	);
}
