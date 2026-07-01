import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';

// Helper to create colored div icons for Leaflet markers based on urgency score
const createUrgencyIcon = (score) => {
  let color = '#22c55e'; // Green (low)
  if (score >= 7.5) color = '#ef4444'; // Red (critical)
  else if (score >= 5.0) color = '#f97316'; // Orange (high)
  else if (score >= 2.5) color = '#eab308'; // Yellow (medium)

  return new L.DivIcon({
    html: `<span style="background-color: ${color};" class="flex h-4 w-4 rounded-full border border-slate-900 shadow-lg animate-pulse"></span>`,
    className: 'custom-urgency-marker',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
};

export default function TaskMap({ tasks, selectedTaskId, onSelectTask, showHeatmap }) {
  // Center map on Seattle or fallback coordinates
  const defaultCenter = [47.606, -122.333];

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-700 h-[450px] shadow-2xl">
      <MapContainer 
        center={defaultCenter} 
        zoom={12} 
        style={{ height: '100%', width: '100%', background: '#0f172a' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {tasks.map(task => {
          const lat = task.location.latitude;
          const lng = task.location.longitude;
          const isSelected = selectedTaskId === task.id;

          return (
            <React.Fragment key={task.id}>
              {/* Task Marker */}
              <Marker
                position={[lat, lng]}
                icon={createUrgencyIcon(task.urgency_score)}
                eventHandlers={{
                  click: () => onSelectTask(task)
                }}
              >
                <Popup>
                  <div className="text-slate-950 p-1 font-sans">
                    <h4 className="font-bold text-sm">{task.title}</h4>
                    <p className="text-xs text-slate-700 mt-1">{task.description}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-brand-100 text-brand-900">
                        Urgency: {task.urgency_score.toFixed(1)}/10
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">ID: {task.id}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* Heatmap density overlay representation: circle with varying transparency and radius */}
              {showHeatmap && (
                <Circle
                  center={[lat, lng]}
                  radius={1200}
                  pathOptions={{
                    color: '#f97316',
                    fillColor: '#ea580c',
                    fillOpacity: 0.15,
                    weight: 1
                  }}
                />
              )}

              {/* Highlight Circle for currently selected task */}
              {isSelected && (
                <Circle
                  center={[lat, lng]}
                  radius={400}
                  pathOptions={{
                    color: '#38bdf8',
                    fillColor: '#0284c7',
                    fillOpacity: 0.3,
                    weight: 2
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
