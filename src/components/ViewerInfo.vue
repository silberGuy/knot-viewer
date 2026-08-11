<template>
	<div class="viewer-info">
		<button class="viewer-info-icon" aria-label="Viewer controls help">
			i
		</button>
		<div class="viewer-info-tooltip">
			<p>Drag to rotate</p>
			<p>Shift + drag to pan</p>
			<p>Scroll to zoom</p>
		</div>
	</div>
</template>

<style scoped>
.viewer-info {
	position: absolute;
	bottom: 1em;
	left: 1em;
	z-index: 1;
}

.viewer-info-icon {
	width: 1.6em;
	height: 1.6em;
	padding: 0.2em;
	border-radius: 50%;
	box-sizing: border-box;
	border: none;
	background: rgba(255, 255, 255, 0.85);
	color: #1e1e1e;
	font-weight: 800;
	cursor: default;
	display: flex;
	align-items: center;
	justify-content: center;
}

.viewer-info-tooltip {
	position: absolute;
	bottom: 2em;
	left: 0;
	display: none;
	white-space: nowrap;
	padding: 0.5em 0.75em;
	background: rgba(255, 255, 255, 0.85);
	color: #1e1e1e;
	border-radius: 8px;
	font-weight: bold;
}

.viewer-info-tooltip p {
	margin: 0;
}

.viewer-info:hover .viewer-info-tooltip {
	display: block;
}
</style>
