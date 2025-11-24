import { InventoryItem, InventoryAction, GameState } from "../../types";

/**
 * Process inventory actions with deduplication and ID management
 */
export function processInventoryActions(
  currentInventory: InventoryItem[],
  actions: InventoryAction[] | undefined,
  nextIds: GameState["nextIds"],
  currentTime: string,
): { inventory: InventoryItem[]; nextIds: GameState["nextIds"] } {
  if (!actions || actions.length === 0) {
    return { inventory: currentInventory, nextIds };
  }

  let newInventory = [...currentInventory];
  const updatedNextIds = { ...nextIds };

  actions.forEach((act) => {
    if (act.action === "add") {
      // Check for duplicates by ID first, then by name
      const exists = newInventory.some(
        (i) => (act.id && i.id === act.id) || i.name === act.name,
      );

      if (!exists) {
        const newId = act.id || updatedNextIds.item++;
        newInventory.push({
          id: newId,
          name: act.name || "Unknown Item",
          visible: {
            description: act.visible?.description || "A mysterious item.",
            notes: act.visible?.notes,
          },
          hidden: {
            truth: act.hidden?.truth || "The truth is hidden.",
            secrets: act.hidden?.secrets,
          },
          createdAt: Date.now(),
          lastModified: Date.now(),
          lore: act.lore,
          unlocked: act.unlocked ?? false, // AI can set true if player already understands
          highlight: true, // New items are always highlighted
        });
      }
    } else if (act.action === "remove") {
      newInventory = newInventory.filter(
        (i) => act.id && i.id !== act.id && i.name !== act.name,
      );
    } else if (act.action === "update") {
      const idx = newInventory.findIndex(
        (i) => (act.id && i.id === act.id) || i.name === act.name,
      );

      if (idx !== -1) {
        let hasVisibleChange = false;

        // Update name if provided
        if (act.newItem) {
          newInventory[idx].name = act.newItem;
          hasVisibleChange = true;
        }
        if (act.name) {
          newInventory[idx].name = act.name;
          hasVisibleChange = true;
        }

        // Update visible layer
        if (act.visible?.description || act.visible?.notes) {
          if (!newInventory[idx].visible) {
            newInventory[idx].visible = { description: "", notes: "" };
          }
          if (act.visible.description) {
            newInventory[idx].visible.description = act.visible.description;
            hasVisibleChange = true;
          }
          if (act.visible.notes) {
            newInventory[idx].visible.notes = act.visible.notes;
            hasVisibleChange = true;
          }
        }

        // Update hidden layer
        if (act.hidden?.truth || act.hidden?.secrets) {
          if (!newInventory[idx].hidden) {
            newInventory[idx].hidden = { truth: "", secrets: [] };
          }
          if (act.hidden.truth) {
            newInventory[idx].hidden.truth = act.hidden.truth;
            // Only highlight if unlocked (otherwise hidden changes aren't visible)
            if (newInventory[idx].unlocked) {
              hasVisibleChange = true;
            }
          }
          if (act.hidden.secrets) {
            newInventory[idx].hidden.secrets = act.hidden.secrets;
            if (newInventory[idx].unlocked) {
              hasVisibleChange = true;
            }
          }
        }

        // Update unlocked state
        if (act.unlocked !== undefined) {
          const wasUnlocked = newInventory[idx].unlocked;
          newInventory[idx].unlocked = act.unlocked;
          // Unlocking is always a visible change
          if (!wasUnlocked && act.unlocked) {
            hasVisibleChange = true;
          }
        }

        // Update metadata
        if (act.lore) {
          newInventory[idx].lore = act.lore;
          hasVisibleChange = true;
        }

        // Set highlight if there was a visible change
        newInventory[idx].highlight = hasVisibleChange;
        newInventory[idx].lastModified = Date.now();
      } else {
        console.warn(
          `[processInventoryActions] Update failed: item "${act.name}" not found`,
        );
      }
    }
  });

  return { inventory: newInventory, nextIds: updatedNextIds };
}
