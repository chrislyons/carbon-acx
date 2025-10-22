#!/bin/bash
# Validate all SKILL.md files in Carbon ACX repository
# Usage: .claude/skills/validate.sh

set -e

SKILLS_DIR="$(cd "$(dirname "$0")" && pwd)"
ERRORS=0
WARNINGS=0

echo "=================================="
echo "Carbon ACX Skills Validation"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Function to validate YAML frontmatter
validate_yaml() {
    local file=$1
    local filename=$(basename "$file")

    # Check for YAML frontmatter markers
    if ! grep -q "^---$" "$file"; then
        echo -e "${RED}ERROR${NC}: $filename missing YAML frontmatter"
        ((ERRORS++))
        return 1
    fi

    # Check for required frontmatter fields
    if ! grep -q "^name:" "$file"; then
        echo -e "${RED}ERROR${NC}: $filename missing 'name' in frontmatter"
        ((ERRORS++))
    fi

    if ! grep -q "^description:" "$file"; then
        echo -e "${RED}ERROR${NC}: $filename missing 'description' in frontmatter"
        ((ERRORS++))
    fi
}

# Function to check required sections
validate_sections() {
    local file=$1
    local filename=$(basename "$file")
    local required=("Purpose" "When to Use" "Allowed Tools" "Expected I/O" "Dependencies" "Examples" "Limitations" "Validation Criteria")

    for section in "${required[@]}"; do
        if ! grep -q "^## $section" "$file"; then
            echo -e "${YELLOW}WARNING${NC}: $filename missing section: $section"
            ((WARNINGS++))
        fi
    done
}

# Function to check for TODOs or placeholders
check_placeholders() {
    local file=$1
    local filename=$(basename "$file")

    # Only flag actual placeholders like [TODO] or <TODO>, not references in documentation
    if grep -q "\[TODO\]\|<TODO>\|FIXME\|XXX\|\[INSERT\]\|PLACEHOLDER" "$file"; then
        echo -e "${YELLOW}WARNING${NC}: $filename contains TODO/placeholder text"
        ((WARNINGS++))
    fi
}

# Validate all SKILL.md files
echo "Validating SKILL.md files..."
echo ""

SKILL_COUNT=0

while IFS= read -r -d '' skill_file; do
    ((SKILL_COUNT++))
    filename=$(basename "$skill_file")
    skilldir=$(basename "$(dirname "$skill_file")")

    echo "Checking: $skilldir/$filename"

    validate_yaml "$skill_file"
    validate_sections "$skill_file"
    check_placeholders "$skill_file"

    echo ""
done < <(find "$SKILLS_DIR" -name "SKILL.md" -print0 | sort -z)

echo "Found $SKILL_COUNT skill(s)"
echo ""

# Validate manifest.json
MANIFEST="$SKILLS_DIR/manifest.json"
echo "Validating manifest.json..."

if [ -f "$MANIFEST" ]; then
    if command -v python3 &> /dev/null; then
        if python3 -m json.tool "$MANIFEST" > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} manifest.json is valid JSON"

            # Check manifest completeness
            skill_count_manifest=$(python3 -c "import json; print(len(json.load(open('$MANIFEST'))['skills']))" 2>/dev/null || echo "0")

            if [ "$skill_count_manifest" -eq "$SKILL_COUNT" ]; then
                echo -e "${GREEN}✓${NC} manifest.json contains all $SKILL_COUNT skills"
            else
                echo -e "${YELLOW}WARNING${NC}: manifest.json has $skill_count_manifest skills but found $SKILL_COUNT SKILL.md files"
                ((WARNINGS++))
            fi
        else
            echo -e "${RED}ERROR${NC}: Invalid JSON in manifest.json"
            ((ERRORS++))
        fi
    else
        echo -e "${YELLOW}WARNING${NC}: python3 not found, skipping manifest.json validation"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}ERROR${NC}: manifest.json not found"
    ((ERRORS++))
fi

echo ""

# Validate config files
echo "Validating configuration files..."

for config in "$SKILLS_DIR"/shared/*/config.json; do
    if [ -f "$config" ]; then
        config_name=$(basename "$(dirname "$config")")/config.json
        if python3 -m json.tool "$config" > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} $config_name is valid JSON"
        else
            echo -e "${RED}ERROR${NC}: Invalid JSON in $config_name"
            ((ERRORS++))
        fi
    fi
done

echo ""

# Check for required directories
echo "Checking directory structure..."

REQUIRED_DIRS=(
    "project/carbon-data-qa"
    "project/carbon-report-gen"
    "project/acx-code-assistant"
    "shared/schema-linter"
    "shared/dependency-audit"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$SKILLS_DIR/$dir" ]; then
        echo -e "${GREEN}✓${NC} $dir exists"
    else
        echo -e "${RED}ERROR${NC}: Missing directory: $dir"
        ((ERRORS++))
    fi
done

echo ""

# Summary
echo "=================================="
echo "Validation Summary"
echo "=================================="
echo "Skills validated: $SKILL_COUNT"
echo -e "Errors: ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All skills validated successfully!${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}✓ Validation passed with warnings${NC}"
    exit 0
else
    echo -e "${RED}✗ Validation failed with $ERRORS error(s)${NC}"
    exit 1
fi
