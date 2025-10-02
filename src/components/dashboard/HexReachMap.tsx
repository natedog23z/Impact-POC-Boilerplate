"use client";

import React, { useMemo, useState, useEffect } from "react";
import Map, { NavigationControl, FullscreenControl } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import { HexagonLayer } from "@deck.gl/aggregation-layers";
import DeckGL from "@deck.gl/react";
import { ScatterplotLayer } from "@deck.gl/layers";
import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import BorderedCard from "@/components/BorderedCard";

export type ReachPoint = [number, number]; // [lng, lat]

export type HexReachMapProps = {
  points: ReachPoint[];
  title?: string;
};

const DEFAULT_VIEW = {
  longitude: -96.9,
  latitude: 37.6,
  zoom: 3.4,
  pitch: 0,
  bearing: 0,
};

export default function HexReachMap({ points, title = "Program Reach" }: HexReachMapProps) {
  const [viewState, setViewState] = useState(DEFAULT_VIEW);

  // Auto-fit to points when available
  useEffect(() => {
    if (!points || points.length === 0) return;
    const lngs = points.map((p) => p[0]);
    const lats = points.map((p) => p[1]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const pad = 0.8; // padding multiplier
    const centerLng = (minLng + maxLng) / 2;
    const centerLat = (minLat + maxLat) / 2;

    // crude zoom fit: wider span -> lower zoom
    const spanLng = Math.max(0.1, maxLng - minLng);
    const spanLat = Math.max(0.1, maxLat - minLat);
    const span = Math.max(spanLng, spanLat);
    const zoom = Math.max(2.2, Math.min(8, 8 - Math.log2(span * pad)));

    setViewState((prev) => ({ ...prev, longitude: centerLng, latitude: centerLat, zoom }));
  }, [points?.length]);

  const hexLayer = useMemo(() => {
    return new HexagonLayer({
      id: "reach-hex",
      data: points,
      getPosition: (d: ReachPoint) => d,
      radius: 24000, // ~24km hex radius for clearer bins
      extruded: false,
      coverage: 1,
      elevationScale: 1,
      opacity: 0.85,
      colorRange: [
        [5, 150, 105],   // emerald-600
        [16, 185, 129],  // emerald-500
        [52, 211, 153],  // emerald-400
        [110, 231, 183], // emerald-300
        [167, 243, 208], // emerald-200
        [209, 250, 229], // emerald-100
      ],
      pickable: false,
      // When there are very few points, hex binning can look empty; keep layer but let fallback dots show
      visible: (points?.length || 0) > 0,
    });
  }, [points]);

  const debugDots = useMemo(() => {
    return new ScatterplotLayer<ReachPoint>({
      id: 'reach-dots',
      data: points,
      getPosition: (d) => d,
      getRadius: 2500,
      radiusUnits: 'meters',
      getFillColor: [59, 130, 246, 160], // blue
      pickable: false,
      visible: (points?.length || 0) > 0,
    });
  }, [points]);

  return (
    <BorderedCard style={{ padding: 0, overflow: "hidden" }}>
      <Box style={{ position: "relative", height: 380 }}>
        <DeckGL
          layers={[hexLayer, debugDots]}
          controller={true}
          initialViewState={DEFAULT_VIEW}
          viewState={viewState as any}
          onViewStateChange={(e: any) => setViewState(e.viewState)}
        >
          <Map
            mapLib={maplibregl as any}
            reuseMaps
            mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
          >
            {/* Empty-state helper */}
            {(!points || points.length === 0) && (
              <Box style={{ position: "absolute", left: 8, top: 8, background: "rgba(255,255,255,0.9)", borderRadius: 10, padding: 10 }}>
                <Text size="2" color="gray">No ZIP code locations available yet.</Text>
              </Box>
            )}
            <Box style={{ position: "absolute", left: 8, bottom: 8, background: "rgba(255,255,255,0.85)", borderRadius: 10, padding: 10 }}>
              <Heading as="h3" size="3" style={{ marginBottom: 4 }}>{title}</Heading>
              <Legend />
            </Box>
            <Box style={{ position: "absolute", right: 8, bottom: 8 }}>
              <NavigationControl showCompass visualizePitch={false} />
            </Box>
            <Box style={{ position: "absolute", right: 8, top: 8 }}>
              <FullscreenControl />
            </Box>
          </Map>
        </DeckGL>
      </Box>
    </BorderedCard>
  );
}

function Legend() {
  const colors = [
    "#10B981",
    "#34D399",
    "#6EE7B7",
    "#A7F3D0",
    "#DCFCE7",
    "#F0FDF4",
  ];
  return (
    <Flex align="center" gap="2">
      <Text weight="bold" size="2">100</Text>
      {colors.map((c, i) => (
        <span key={i} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: c, display: "inline-block" }} />
      ))}
      <Text size="2">0</Text>
    </Flex>
  );
}


