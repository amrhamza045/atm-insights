import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function ItemOptionsDialog({ item, open, onClose, onAdd }) {
  const [selectedOptions, setSelectedOptions] = useState({});
  const [optionQuantities, setOptionQuantities] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState(null);

  const filteredSizes = item?.sizes;

  useEffect(() => {
    if (open) setSelectedSize(null);
  }, [filteredSizes, open]);

  const { data: menuOptions = [] } = useQuery({
    queryKey: ["menuOptions"],
    queryFn: () => base44.entities.MenuOption.list()
  });

  const { data: itemOptions = [] } = useQuery({
    queryKey: ["itemOptions", item?.id],
    queryFn: async () => {
      if (!item?.id) return [];
      const allOptions = await base44.entities.MenuItemOption.list();
      return allOptions.filter(io => io.menu_item_id === item.id);
    },
    enabled: !!item?.id
  });

  const handleAddToCart = () => {
    // Validate size selection if sizes are shown to user
    if (filteredSizes && filteredSizes.length > 0 && !selectedSize) {
      alert("Please select a size");
      return;
    }
    
    // Validate max selections for multi-select options
    for (const [itemOptionId, choices] of Object.entries(selectedOptions)) {
      const itemOption = itemOptions.find(io => io.id === itemOptionId);
      if (!itemOption) continue;
      
      const menuOption = menuOptions.find(o => o.id === itemOption.option_id);
      if (menuOption?.option_type === "multiple_select" && menuOption.max_selections) {
        const totalItems = (choices || []).reduce((sum, choice) => {
          const qty = optionQuantities[`${itemOptionId}_${choice}`] || 1;
          return sum + qty;
        }, 0);
        
        if (totalItems > menuOption.max_selections) {
          alert(`${menuOption.name}: Maximum ${menuOption.max_selections} items allowed (you have ${totalItems})`);
          return;
        }
      }
    }
    
    // Separate mandatory and optional options
    let mandatoryPriceModifier = 0;
    const mandatoryOptionsWithModifiers = {};
    const mandatoryOptionNames = [];
    const optionalItems = [];
    
    // selectedOptions uses itemOption.id as key, need to convert to menuOption data
    Object.entries(selectedOptions).forEach(([itemOptionId, choices]) => {
      const itemOption = itemOptions.find(io => io.id === itemOptionId);
      if (!itemOption) return;
      
      const menuOption = menuOptions.find(o => o.id === itemOption.option_id);
      if (menuOption && Array.isArray(choices) && choices.length > 0) {
        let totalModifier = 0;
        const choicesDisplay = [];
        
        choices.forEach(choice => {
          const value = menuOption.values?.find(v => v.label === choice);
          const qty = optionQuantities[`${itemOptionId}_${choice}`] || 1;
          
          if (value?.price_modifier) {
            totalModifier += value.price_modifier * qty;
          }
          
          if (qty > 1) {
            choicesDisplay.push(`${qty}x ${choice}`);
          } else {
            choicesDisplay.push(choice);
          }
        });

        if (menuOption.is_mandatory !== false) {
          // Mandatory option - combines with item
          mandatoryOptionsWithModifiers[itemOptionId] = { 
            optionName: menuOption.name,
            choices, 
            totalModifier 
          };
          mandatoryOptionNames.push(choicesDisplay.join(", "));
          mandatoryPriceModifier += totalModifier;
        } else {
          // Optional option - separate line item for each choice
          choices.forEach(choice => {
            const value = menuOption.values?.find(v => v.label === choice);
            const qty = optionQuantities[`${itemOptionId}_${choice}`] || 1;
            const choiceModifier = (value?.price_modifier || 0) * qty;
            
            optionalItems.push({
              optionName: menuOption.name,
              choices: qty > 1 ? `${qty}x ${choice}` : choice,
              priceModifier: choiceModifier,
              itemOptionId,
              quantity: qty
            });
          });
        }
      }
    });

    // Build combined name with size and mandatory options
    const sizePrefix = selectedSize ? `${selectedSize.name} - ` : "";
    const combinedName = mandatoryOptionNames.length > 0 ? `${sizePrefix}${item.name}\n${mandatoryOptionNames.join("\n")}` : `${sizePrefix}${item.name}`;

    // Get price based on selected size or base price
    const itemPrice = selectedSize ? (selectedSize.price || item.price) : item.price;

    // Add main item with mandatory options
    onAdd({
      ...item,
      name: combinedName,
      price: itemPrice,
      selectedSize: selectedSize,
      quantity,
      selectedOptions: Object.keys(mandatoryOptionsWithModifiers).length > 0 ? 
        Object.fromEntries(Object.entries(selectedOptions).filter(([k]) => mandatoryOptionsWithModifiers[k])) : {},
      optionPriceModifier: mandatoryPriceModifier,
      optionsWithModifiers: mandatoryOptionsWithModifiers,
      optionalItems // Pass optional items to be added separately
    });
    
    setSelectedOptions({});
    setOptionQuantities({});
    setQuantity(1);
    setSelectedSize(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item?.name}</DialogTitle>
        </DialogHeader>

        {/* Size Selection - Mandatory if sizes exist */}
        {filteredSizes && filteredSizes.length > 0 && (
          <div className="space-y-3 pb-4 border-b">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">Select Size</p>
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Required</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {filteredSizes.map((size, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedSize(size)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedSize?.name === size.name
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <p className="font-medium text-sm">{size.name}</p>
                  <p className="text-xs text-slate-600">{formatCurrency(size.price)}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {itemOptions.length > 0 && (
          <div className="space-y-4 max-h-96 overflow-y-auto py-4">
            {itemOptions
              .sort((a, b) => {
                const optionA = menuOptions.find(o => o.id === a.option_id);
                const optionB = menuOptions.find(o => o.id === b.option_id);
                const isMandatoryA = optionA?.is_mandatory !== false;
                const isMandatoryB = optionB?.is_mandatory !== false;
                if (isMandatoryA && !isMandatoryB) return -1;
                if (!isMandatoryA && isMandatoryB) return 1;
                return 0;
              })
              .map(itemOption => {
              const option = menuOptions.find(o => o.id === itemOption.option_id);
              if (!option) return null;

              return (
                <Card key={itemOption.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium text-sm">{option.name}</p>
                      {option.is_mandatory === false && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Optional - Separate Line</span>
                      )}
                    </div>
                    {option.option_type === "multiple_select" && option.max_selections && (
                      <div className="text-xs text-slate-600 bg-blue-50 border border-blue-200 rounded p-2 mb-2">
                        Maximum {option.max_selections} items total
                        {(() => {
                          const totalItems = (selectedOptions[itemOption.id] || []).reduce((sum, choice) => {
                            const qty = optionQuantities[`${itemOption.id}_${choice}`] || 1;
                            return sum + qty;
                          }, 0);
                          return totalItems > 0 ? ` (Selected: ${totalItems})` : '';
                        })()}
                      </div>
                    )}
                     <div className="space-y-2">
                       {(option.values || []).map((value, idx) => {
                         const isSelected = selectedOptions[itemOption.id]?.includes(value.label) || false;
                         const qtyKey = `${itemOption.id}_${value.label}`;
                         const currentQty = optionQuantities[qtyKey] || 1;
                         
                         return (
                         <div key={`${itemOption.id}-${idx}`} className="flex items-center space-x-2">
                           <Checkbox
                             id={`${itemOption.id}-${idx}`}
                             checked={isSelected}
                             onCheckedChange={(checked) => {
                               setSelectedOptions(prev => {
                                 const current = prev[itemOption.id] || [];
                                 if (checked) {
                                   return { ...prev, [itemOption.id]: [...current, value.label] };
                                 } else {
                                   setOptionQuantities(prevQty => {
                                     const newQty = { ...prevQty };
                                     delete newQty[qtyKey];
                                     return newQty;
                                   });
                                   return { ...prev, [itemOption.id]: current.filter(c => c !== value.label) };
                                 }
                               });
                             }}
                           />
                           <Label 
                             htmlFor={`${itemOption.id}-${idx}`}
                             className="text-sm font-normal cursor-pointer flex-1"
                           >
                             {value.label}
                             {value.price_modifier > 0 && <span className="text-xs text-slate-500 ml-2">+{formatCurrency(value.price_modifier)}</span>}
                           </Label>
                           
                           {isSelected && (
                             <div className="flex items-center gap-1">
                               <Button 
                                 variant="outline" 
                                 size="sm" 
                                 onClick={() => setOptionQuantities(prev => ({
                                   ...prev,
                                   [qtyKey]: Math.max(1, currentQty - 1)
                                 }))}
                                 className="h-6 w-6 p-0"
                               >
                                 -
                               </Button>
                               <span className="w-6 text-center text-xs font-medium">{currentQty}</span>
                               <Button 
                                 variant="outline" 
                                 size="sm" 
                                 onClick={() => {
                                   if (option.max_selections) {
                                     const totalItems = (selectedOptions[itemOption.id] || []).reduce((sum, choice) => {
                                       const qty = optionQuantities[`${itemOption.id}_${choice}`] || 1;
                                       return sum + qty;
                                     }, 0);

                                     if (totalItems >= option.max_selections) {
                                       alert(`Maximum ${option.max_selections} items allowed`);
                                       return;
                                     }
                                   }

                                   setOptionQuantities(prev => ({
                                     ...prev,
                                     [qtyKey]: currentQty + 1
                                   }));
                                 }}
                                 className="h-6 w-6 p-0"
                               >
                                 +
                               </Button>
                             </div>
                           )}
                         </div>
                         );
                       })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2 py-3 border-t">
          <span className="text-sm font-medium">Qty:</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="h-7 w-7 p-0"
          >
            -
          </Button>
          <span className="w-8 text-center text-sm font-medium">{quantity}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setQuantity(quantity + 1)}
            className="h-7 w-7 p-0"
          >
            +
          </Button>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAddToCart} className="flex-1">
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}