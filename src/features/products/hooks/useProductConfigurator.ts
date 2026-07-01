import { useState, useMemo, useEffect, useRef } from 'react';
import { Product } from '../../../types';
import { computePrice } from '../../../lib/pricing';
import { usePricingConfig } from './usePricingConfig';
import { getCustomizableAttributes } from '../attributes';

export function useProductConfigurator(product: Product | undefined) {
  const [selections, setSelections] = useState<Record<string, string>>({});

  const productId = product?.id;

  // Customizable attributes drive the configurator (fixed attributes are
  // display-only). `getCustomizableAttributes` already filters to active.
  const attrs = useMemo(() => getCustomizableAttributes(product), [product]);
  const attrsStr = JSON.stringify(attrs);

  const prevProductId = useRef(productId);

  // Reset or validate selections when product or its options change
  useEffect(() => {
    if (product && attrs.length > 0) {
      setSelections(prev => {
        let changed = false;
        let next = { ...prev };

        // If product completely changed, wipe selections to prevent carrying over
        // unrelated choices that happen to have the same attribute keys.
        if (prevProductId.current !== product.id) {
          next = {};
          changed = true;
          prevProductId.current = product.id;
        }

        // Clear selections for attributes that no longer exist
        const validKeys = new Set(attrs.map(a => a.key));
        Object.keys(next).forEach(k => {
          if (!validKeys.has(k)) {
            delete next[k];
            changed = true;
          }
        });

        attrs.forEach(a => {
          if (a.type === 'text') return; // Text options don't use 'available'

          const options = a.options ?? [];
          const currentVal = next[a.key];
          const hasCurrentVal = currentVal !== undefined;
          const currentOpt = hasCurrentVal ? options.find(o => o.id === currentVal) : undefined;

          // Reset if currently selected option is missing or unavailable
          if (hasCurrentVal && (!currentOpt || currentOpt.available === false)) {
            const firstAvailable = options.find(o => o.available !== false);
            if (a.required && firstAvailable) {
              next[a.key] = firstAvailable.id;
              changed = true;
            } else {
              delete next[a.key];
              changed = true;
            }
          }
          // Initialize if nothing is selected but it's required
          else if (!hasCurrentVal && a.required) {
            const firstAvailable = options.find(o => o.available !== false);
            if (firstAvailable) {
              next[a.key] = firstAvailable.id;
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
  }, [productId, attrsStr]);

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
    return attrs.map(attr => {
      const options = attr.options ?? [];
      const selVal = selections[attr.key];
      let opt = selVal ? options.find(o => o.id === selVal) : undefined;
      let textValue: string | undefined;

      // An option counts as selected unless it's explicitly unavailable.
      // (`available` is the canonical flag used by the option buttons + init;
      // `active` is often unset on real data, so never gate on its truthiness.)
      if (attr.type !== 'text' && opt && (opt.available === false || opt.active === false)) {
        opt = undefined;
      }

      if (attr.type === 'text') {
        if (selVal && selVal.trim().length > 0) {
          opt = options[0];
          textValue = selVal.trim();
        }
      }
      return { group: attr, opt, textValue };
    });
  }, [attrs, selections]);

  const selectedOptions = useMemo(() => {
    return selectedPairs.map(p => ({
      groupId: p.group.key,
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
