/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { IDisposable, dispose } from 'vs/base/common/lifecycle';
import * as dom from 'vs/base/browser/dom';
import { ScrollableElementCreationOptions, ScrollableElementChangeOptions } from 'vs/base/browser/ui/scrollbar/scrollableElementOptions';
import { IOverviewRulerLayoutInfo, ScrollableElement } from 'vs/base/browser/ui/scrollbar/scrollableElement';
import { INewScrollPosition } from 'vs/editor/common/editorCommon';
import { ClassNames } from 'vs/editor/browser/editorBrowser';
import { ViewPart, PartFingerprint, PartFingerprints } from 'vs/editor/browser/view/viewPart';
import { Scrollable } from 'vs/base/common/scrollable';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * as viewEvents from 'vs/editor/common/view/viewEvents';
import { IRenderingContext, IRestrictedRenderingContext } from 'vs/editor/common/view/renderingContext';

export class EditorScrollbar extends ViewPart {

	private scrollable: Scrollable;
	private toDispose: IDisposable[];
	private linesContent: HTMLElement;
	private scrollbar: ScrollableElement;

	constructor(context: ViewContext, scrollable: Scrollable, linesContent: HTMLElement, viewDomNode: HTMLElement, overflowGuardDomNode: HTMLElement) {
		super(context);

		this.toDispose = [];
		this.scrollable = scrollable;
		this.linesContent = linesContent;

		const viewInfo = this._context.configuration.editor.viewInfo;
		const configScrollbarOpts = viewInfo.scrollbar;

		let scrollbarOptions: ScrollableElementCreationOptions = {
			canUseTranslate3d: viewInfo.canUseTranslate3d,
			listenOnDomNode: viewDomNode,
			className: ClassNames.SCROLLABLE_ELEMENT + ' ' + viewInfo.theme,
			useShadows: false,
			lazyRender: true,

			vertical: configScrollbarOpts.vertical,
			horizontal: configScrollbarOpts.horizontal,
			verticalHasArrows: configScrollbarOpts.verticalHasArrows,
			horizontalHasArrows: configScrollbarOpts.horizontalHasArrows,
			verticalScrollbarSize: configScrollbarOpts.verticalScrollbarSize,
			verticalSliderSize: configScrollbarOpts.verticalSliderSize,
			horizontalScrollbarSize: configScrollbarOpts.horizontalScrollbarSize,
			horizontalSliderSize: configScrollbarOpts.horizontalSliderSize,
			handleMouseWheel: configScrollbarOpts.handleMouseWheel,
			arrowSize: configScrollbarOpts.arrowSize,
			mouseWheelScrollSensitivity: configScrollbarOpts.mouseWheelScrollSensitivity,
		};

		this.scrollbar = new ScrollableElement(linesContent, scrollbarOptions, this.scrollable);
		PartFingerprints.write(this.scrollbar.getDomNode(), PartFingerprint.ScrollableElement);

		this.toDispose.push(this.scrollbar);

		// When having a zone widget that calls .focus() on one of its dom elements,
		// the browser will try desperately to reveal that dom node, unexpectedly
		// changing the .scrollTop of this.linesContent

		let onBrowserDesperateReveal = (domNode: HTMLElement, lookAtScrollTop: boolean, lookAtScrollLeft: boolean) => {
			const scrollState = this.scrollable.getState();
			let newScrollPosition: INewScrollPosition = {};

			if (lookAtScrollTop) {
				let deltaTop = domNode.scrollTop;
				if (deltaTop) {
					newScrollPosition.scrollTop = scrollState.scrollTop + deltaTop;
					domNode.scrollTop = 0;
				}
			}

			if (lookAtScrollLeft) {
				let deltaLeft = domNode.scrollLeft;
				if (deltaLeft) {
					newScrollPosition.scrollLeft = scrollState.scrollLeft + deltaLeft;
					domNode.scrollLeft = 0;
				}
			}

			this.scrollable.updateState(newScrollPosition);
		};

		// I've seen this happen both on the view dom node & on the lines content dom node.
		this.toDispose.push(dom.addDisposableListener(viewDomNode, 'scroll', (e: Event) => onBrowserDesperateReveal(viewDomNode, true, true)));
		this.toDispose.push(dom.addDisposableListener(linesContent, 'scroll', (e: Event) => onBrowserDesperateReveal(linesContent, true, false)));
		this.toDispose.push(dom.addDisposableListener(overflowGuardDomNode, 'scroll', (e: Event) => onBrowserDesperateReveal(overflowGuardDomNode, true, false)));
	}

	public dispose(): void {
		this.toDispose = dispose(this.toDispose);
	}

	public getOverviewRulerLayoutInfo(): IOverviewRulerLayoutInfo {
		return this.scrollbar.getOverviewRulerLayoutInfo();
	}

	public getScrollbarContainerDomNode(): HTMLElement {
		return this.scrollbar.getDomNode();
	}

	public delegateVerticalScrollbarMouseDown(browserEvent: MouseEvent): void {
		this.scrollbar.delegateVerticalScrollbarMouseDown(browserEvent);
	}

	public getVerticalSliderVerticalCenter(): number {
		return this.scrollbar.getVerticalSliderVerticalCenter();
	}

	// --- begin event handlers

	public onConfigurationChanged(e: viewEvents.ViewConfigurationChangedEvent): boolean {
		const viewInfo = this._context.configuration.editor.viewInfo;

		this.scrollbar.updateClassName(ClassNames.SCROLLABLE_ELEMENT + ' ' + viewInfo.theme);
		if (e.viewInfo.scrollbar || e.viewInfo.canUseTranslate3d) {
			let newOpts: ScrollableElementChangeOptions = {
				canUseTranslate3d: viewInfo.canUseTranslate3d,
				handleMouseWheel: viewInfo.scrollbar.handleMouseWheel,
				mouseWheelScrollSensitivity: viewInfo.scrollbar.mouseWheelScrollSensitivity
			};
			this.scrollbar.updateOptions(newOpts);
		}
		return true;
	}
	public onCursorPositionChanged(e: viewEvents.ViewCursorPositionChangedEvent): boolean {
		return false;
	}
	public onCursorSelectionChanged(e: viewEvents.ViewCursorSelectionChangedEvent): boolean {
		return false;
	}
	public onDecorationsChanged(e: viewEvents.ViewDecorationsChangedEvent): boolean {
		return false;
	}
	public onFlushed(e: viewEvents.ViewFlushedEvent): boolean {
		return false;
	}
	public onFocusChanged(e: viewEvents.ViewFocusChangedEvent): boolean {
		return false;
	}
	public onLineChanged(e: viewEvents.ViewLineChangedEvent): boolean {
		return false;
	}
	public onLineMappingChanged(e: viewEvents.ViewLineMappingChangedEvent): boolean {
		return false;
	}
	public onLinesDeleted(e: viewEvents.ViewLinesDeletedEvent): boolean {
		return false;
	}
	public onLinesInserted(e: viewEvents.ViewLinesInsertedEvent): boolean {
		return false;
	}
	public onRevealRangeRequest(e: viewEvents.ViewRevealRangeRequestEvent): boolean {
		return false;
	}
	public onScrollChanged(e: viewEvents.ViewScrollChangedEvent): boolean {
		return true;
	}
	public onScrollRequest(e: viewEvents.ViewScrollRequestEvent): boolean {
		return false;
	}
	public onTokensChanged(e: viewEvents.ViewTokensChangedEvent): boolean {
		return false;
	}
	public onZonesChanged(e: viewEvents.ViewZonesChangedEvent): boolean {
		return false;
	}

	// --- end event handlers

	public prepareRender(ctx: IRenderingContext): void {
		// Nothing to do
	}

	public render(ctx: IRestrictedRenderingContext): void {
		this.scrollbar.renderNow();
	}
}
