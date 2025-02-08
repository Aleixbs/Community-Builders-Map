import arcpy
import unicodedata
import re

# Set workspace (optional, depends on your environment)
arcpy.env.workspace = r"C:\Users\Usuario\Documents\ArcGIS\Projects\CommunityBuildersMap\CommunityBuildersMap.gdb"

# Define the input and provincias layers
input_layer = "Comunidades"  # Replace with your input layer name
provincias_layer = "Provincias"  # Replace with your provincias layer name

# Define the fields
input_field = "Localización_habitual"  # Field in input layer
output_field = "Localizacion"          # Field to store matched province
provincias_field = "NAMEUNIT"          # Field in provincias layer

# Function to normalize and clean names
def normalize_name(name):
    if name is None:
        return ""
    # Convert to string and uppercase
    name = str(name).upper()
    # Remove accents
    name = unicodedata.normalize('NFD', name)
    name = ''.join(c for c in name if unicodedata.category(c) != 'Mn')
    # Remove special characters except periods (for 'n.a.')
    name = re.sub(r'[^A-Z\s\.]', '', name)
    # Replace multiple spaces with a single space
    name = re.sub(r'\s+', ' ', name)
    # Trim leading and trailing spaces
    name = name.strip()
    return name

# Define invalid or null values
invalid_values = {'', 'NA', 'N A', 'N.A', 'N A.', 'N/A', 'ITINERANTE', 'NULL'}

# Create a dictionary of normalized province names
provincias_dict = {}
with arcpy.da.SearchCursor(provincias_layer, [provincias_field]) as cursor:
    for row in cursor:
        prov_name = row[0]
        normalized_prov_name = normalize_name(prov_name)
        provincias_dict[normalized_prov_name] = prov_name  # Store original name for output

# Update the input layer
with arcpy.da.UpdateCursor(input_layer, [input_field, output_field]) as cursor:
    for row in cursor:
        loc_name = row[0]
        normalized_loc_name = normalize_name(loc_name)

        # Initialize matched province
        matched_province = None

        # Check for null or invalid values
        if normalized_loc_name in invalid_values:
            matched_province = None  # Set to None or handle as needed
        else:
            # Attempt to find a partial match
            for prov_norm_name, prov_original_name in provincias_dict.items():
                if prov_norm_name in normalized_loc_name or normalized_loc_name in prov_norm_name:
                    matched_province = prov_original_name
                    break  # Stop after first match

        # Handle unmatched cases
        if matched_province:
            row[1] = matched_province
        else:
            row[1] = None  # Or handle as needed, e.g., row[1] = "Unmatched"

        # Update the row
        cursor.updateRow(row)

print("Processing completed.")
