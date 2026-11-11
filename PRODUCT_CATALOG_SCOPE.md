# Product Catalog Scope

The catalog represents two equally important departments: Home Appliances and Home Decor. Lighting is one decor category and keeps its specialized lumen and ceiling-clearance tools; it does not define the overall store experience.

Categories use a parent-child tree. Department records are roots, and product records belong to leaf categories. Selecting a department filters products across its child categories.

Product metadata is type-specific. Room, design style, color palette, materials, and companion tags support discovery and cross-selling. Technical attributes use explicit keys and units, such as power in watts, capacity in liters, and applicable room area in square meters. Missing specifications must stay missing rather than be inferred.

Seed data should stay balanced between the two departments, include enough products per leaf category for useful filtering, and provide distinct attributes, room/style associations, and realistic companion tags. Tags are catalog hints; collaborative recommendations still require interaction events such as views, cart additions, and purchases.

The current seed adds representative products for kitchen appliances, air care, laundry utility, tabletop decor, wall decor, textiles, aromatherapy/greenery, and accent furniture. The original lighting calculator remains available for lighting products only.
