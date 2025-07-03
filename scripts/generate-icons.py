#!/usr/bin/env python3
"""
Generate app icons from SVG source for ENGIE
Requires: pip install cairosvg pillow
"""

import os
import sys
from pathlib import Path

try:
    import cairosvg
    from PIL import Image
    import subprocess
except ImportError as e:
    print(f"Missing required package: {e}")
    print("Install with: pip install cairosvg pillow")
    sys.exit(1)

# Icon sizes needed for macOS
ICON_SIZES = {
    16: "icon_16x16.png",
    32: "icon_32x32.png", 
    64: "icon_64x64.png",
    128: "icon_128x128.png",
    256: "icon_256x256.png",
    512: "icon_512x512.png",
    1024: "icon_1024x1024.png"
}

def generate_png_from_svg(svg_path, output_dir):
    """Generate PNG icons from SVG source"""
    print(f"🎨 Generating icons from {svg_path}")
    
    for size, filename in ICON_SIZES.items():
        output_path = output_dir / filename
        
        print(f"  📐 Creating {size}x{size} icon...")
        
        # Convert SVG to PNG using cairosvg
        cairosvg.svg2png(
            url=str(svg_path),
            write_to=str(output_path),
            output_width=size,
            output_height=size,
            background_color='transparent'
        )
        
        # Optimize with PIL
        img = Image.open(output_path)
        img = img.convert('RGBA')
        img.save(output_path, 'PNG', optimize=True)
        
        print(f"    ✅ {filename}")

def create_icns_file(png_dir, output_path):
    """Create macOS .icns file from PNG images"""
    print(f"🍎 Creating macOS .icns file...")
    
    try:
        # Create iconset directory
        iconset_dir = png_dir / "icon.iconset"
        iconset_dir.mkdir(exist_ok=True)
        
        # Copy and rename PNGs for iconset
        iconset_mapping = {
            "icon_16x16.png": "icon_16x16.png",
            "icon_32x32.png": ["icon_16x16@2x.png", "icon_32x32.png"],
            "icon_64x64.png": "icon_32x32@2x.png",
            "icon_128x128.png": ["icon_64x64@2x.png", "icon_128x128.png"],
            "icon_256x256.png": ["icon_128x128@2x.png", "icon_256x256.png"],
            "icon_512x512.png": ["icon_256x256@2x.png", "icon_512x512.png"],
            "icon_1024x1024.png": "icon_512x512@2x.png"
        }
        
        for source, targets in iconset_mapping.items():
            source_path = png_dir / source
            if source_path.exists():
                if isinstance(targets, list):
                    for target in targets:
                        target_path = iconset_dir / target
                        target_path.write_bytes(source_path.read_bytes())
                else:
                    target_path = iconset_dir / targets
                    target_path.write_bytes(source_path.read_bytes())
        
        # Convert iconset to icns using iconutil
        subprocess.run([
            'iconutil', '-c', 'icns', str(iconset_dir),
            '-o', str(output_path)
        ], check=True)
        
        # Clean up iconset directory
        import shutil
        shutil.rmtree(iconset_dir)
        
        print(f"    ✅ {output_path.name}")
        
    except subprocess.CalledProcessError:
        print("    ❌ Failed to create .icns file (iconutil not available)")
        print("    💡 You can create it manually or use a different tool")
    except Exception as e:
        print(f"    ❌ Error creating .icns file: {e}")

def main():
    # Get project root directory
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    assets_dir = project_root / "assets" / "icons"
    
    # Paths
    svg_path = assets_dir / "engie-icon.svg"
    icns_path = assets_dir / "icon.icns"
    
    if not svg_path.exists():
        print(f"❌ SVG source not found: {svg_path}")
        sys.exit(1)
    
    # Generate PNG icons
    generate_png_from_svg(svg_path, assets_dir)
    
    # Create macOS .icns file
    create_icns_file(assets_dir, icns_path)
    
    print("\n🎉 Icon generation complete!")
    print(f"📁 Icons created in: {assets_dir}")
    print("🚀 Ready for app packaging!")

if __name__ == "__main__":
    main()