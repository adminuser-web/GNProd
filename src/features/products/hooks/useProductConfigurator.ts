import { useState, useMemo, useEffect, useRef } from 'react';
import { Product } from '../../../types';
import { computePrice } from '../../../lib/pricing';
import { usePricingConfig } from './usePricingConfig';

export function useProductConfigurator(product: Product | undefined) {
  const [selections, setSelections] = useState<Record<string, string>>({});

  const productId = product?.id;
  const groupsStr = JSON.stringify(product?.customizationGroups || []);

  const prevProductId = useRef(productId);

  // Reset or validate selections when product or its options change
  useEffect(() => {
    if (product && product.customizationGroups) {
      setSelections(prev => {
        let changed = false;
        let next = { ...prev };

        // If product completely changed, wipe selections to prevent carrying over
        // unrelated choices that happen to have the same group IDs.
        if (prevProductId.current !== product.id) {
          next = {};
          changed = true;
          prevProductId.current = product.id;
        }

        // Clear selections for groups that no longer exist
        const validGroupIds = new Set(product.customizationGroups.map(g => g.id));
        Object.keys(next).forEach(k => {
          if (!validGroupIds.has(k)) {
            delete next[k];
            changed = true;
          }
        });

        product.customizationGroups.filter(g => g.enabled !== false).forEach(g => {
          if (g.type === 'text') return; // Text options don't use 'available'
          
          const currentVal = next[g.id];
          const hasCurrentVal = currentVal !== undefined;
          const currentOpt = hasCurrentVal ? g.options.find(o => o.id === currentVal) : undefined;
          
          // Reset if currently selected option is missing or unavailable
          if (hasCurrentVal && (!currentOpt || currentOpt.available === false)) {
            const firstAvailable = g.options.find(o => o.available !== false);
            if (g.required && firstAvailable) {
              next[g.id] = firstAvailable.id;
              changed = true;
            } else {
              delete next[g.id];
              changed = true;
            }
          }
          // Initialize if nothing is selected but it's required
          else if (!hasCurrentVal && g.required) {
            const firstAvailable = g.options.find(o => o.available !== false);
            if (firstAvailable) {
              next[g.id] = firstAvailable.id;
              changed = true;
            }
          }
        });

        // Deep equality check to prevent unnecessary updates
        const prevJson = JSON.stringify(prev);
        const nextJson = JSON.stringify(next);
        return prevJson !== nextJson ? next : prev;
      });
    } else {
      setSelections({});
    }
  }, [productId, groupsStr]);

  const toggleSelection = (groupId: string, value: string, groupType: string) => {
    setSelections(prev => {
      if (groupType === 'text') {
        const next = { ...prev };
        if (!value) delete next[groupId];
        else next[groupId] = value;
        return next;
      }
      if (groupType === 'toggle') {
        const isSelected = prev[groupId] === value;
        const next = { ...prev };
        if (isSelected) delete next[groupId];
        else next[groupId] = value;
        return next;
      }
      return { ...prev, [groupId]: value };
    });
  };

  const selectedPairs = useMemo(() => {
    if (!product?.customizationGroups) return [];
    return product.customizationGroups
      .filter(g => g.enabled !== false)
      .map(group => {
        const selVal = selections[group.id];
        let opt = selVal ? group.options.find(o => o.id === selVal) : undefined;
        let textValue: string | undefined;

        if (group.type !== 'text' && opt && !opt.active) {
          opt = undefined;
        }

        if (group.type === 'text') {
          if (selVal && selVal.trim().length > 0) {
            opt = group.options[0];
            textValue = selVal.trim();
          }
        }
        return { group, opt, textValue };
    });
  }, [product, selections]);

  const selectedOptions = useMemo(() => {
    return selectedPairs.map(p => ({
      groupId: p.group.id,
      groupLabel: p.group.label,
      optionId: p.opt?.id || '',
      optionLabel: p.textValue ? p.textValue : (p.opt?.label || ''),
      priceDelta: p.opt?.priceDelta || 0,
      valueText: p.textValue,
      type: p.group.type
    })).filter(o => o.optionId);
  }, [selectedPairs]);

  const selectedLabels = useMemo(() => {
    return selectedPairs
      .filter(p => p.opt)
      .map(p => {
        if (p.group.type === 'text' && p.textValue) {
          return `${p.group.label}: "${p.textValue}"`;
        }
        return `${p.group.label}: ${p.opt!.label}`;
      })
      .join('\n');
  }, [selectedPairs]);

  const missingGroups = useMemo(() => {
    return selectedPairs.filter(p => p.group.required && !p.opt).map(p => p.group.label);
  }, [selectedPairs]);

  const allRequiredSelected = missingGroups.length === 0;

  const { rules: globalRules, codes: globalCodes } = usePricingConfig();
  const { subtotal: pricePerItem, total: pricePerItemWithDiscount } = useMemo(() => {
    if (!product) return { subtotal: 0, total: 0 };
    return computePrice(product, selections, { rules: globalRules, availableCodes: globalCodes });
  }, [product, selections, globalRules, globalCodes]);

  return {
    selections,
    toggleSelection,
    selectedPairs,
    selectedOptions,
    selectedLabels,
    missingGroups,
    allRequiredSelected,
    pricePerItem,
    pricePerItemWithDiscount
  };
}
