"""
Geo-projection utility: maps EPANET local coordinates to Chandigarh lat/lng.

The hydraulic simulation relies on Length/Diameter/Roughness stored in the INP
file — NOT on these visual coordinates.  So warping them has zero impact on
physics, AI, or flow conservation.
"""

import json, os, math

# ── Chandigarh Sector Grid ────────────────────────────────────────
# Chandigarh's planned city has a strict rectangular sector grid
# rotated ~33° clockwise from true north (the V2/V3 arterial roads).
# The Capitol Complex is at the NE corner; Mohali borders the SW.
#
# We centre the network on Sectors 17-22-35 (the commercial heart)
# and rotate L-Town's orthogonal pipe lines to match the sector axes.

CITY_CENTER_LAT = 30.7410   # centre of Sectors 22/35 area
CITY_CENTER_LNG = 76.7780

# Scale: degrees per EPANET unit.
# L-Town spans ~2700 units wide.  Chandigarh's grid spans ~7 km E-W.
# 7 km ≈ 0.063° longitude.  0.063 / 2700 ≈ 2.3e-5
SCALE_X = 0.0000230   # lng per EPANET-X unit
SCALE_Y = 0.0000210   # lat per EPANET-Y unit (slightly tighter N-S)

# Rotation: Chandigarh's grid is rotated ~33° CW from true north.
ROTATION_DEG = -33


def project_topology(topo_path: str, output_path: str | None = None):
    """Read map_topology.json, add lat/lng fields, write back."""
    with open(topo_path, 'r') as f:
        data = json.load(f)

    nodes = data['nodes']

    # 1. Find EPANET coordinate bounds & centre
    xs = [n['x'] for n in nodes]
    ys = [n['y'] for n in nodes]
    cx = (min(xs) + max(xs)) / 2
    cy = (min(ys) + max(ys)) / 2

    # 2. Rotation matrix
    theta = math.radians(ROTATION_DEG)
    cos_t = math.cos(theta)
    sin_t = math.sin(theta)

    for node in nodes:
        # Centre the coords
        dx = node['x'] - cx
        dy = node['y'] - cy

        # Rotate
        rx = dx * cos_t - dy * sin_t
        ry = dx * sin_t + dy * cos_t

        # Scale to lat/lng offsets (separate X/Y scales for aspect ratio)
        node['lat'] = round(CITY_CENTER_LAT + ry * SCALE_Y, 6)
        node['lng'] = round(CITY_CENTER_LNG + rx * SCALE_X, 6)

    # 3. Write out
    dst = output_path or topo_path
    with open(dst, 'w') as f:
        json.dump(data, f)

    lats = [n['lat'] for n in nodes]
    lngs = [n['lng'] for n in nodes]
    print(f"Projected {len(nodes)} nodes onto Chandigarh")
    print(f"  Lat: {min(lats):.4f} - {max(lats):.4f}")
    print(f"  Lng: {min(lngs):.4f} - {max(lngs):.4f}")
    print(f"  Rotation: {ROTATION_DEG} deg, Scale: {SCALE_X}/{SCALE_Y}")
    return data


if __name__ == '__main__':
    topo = os.path.join(os.path.dirname(__file__), '..', '..', 'command-center', 'src', 'assets', 'map_topology.json')
    project_topology(topo)
