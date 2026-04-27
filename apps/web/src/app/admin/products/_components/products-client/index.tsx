'use client';

import { formatCurrency } from '@/lib/utils';
import { getImageUrl } from '@/lib/admin-api';
import { Plus, Pencil, Power, Loader2, ChevronDown, ImagePlus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useProductsPage } from '../use-products-page';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ProductDialog } from './product-dialog';
import { ExtraDialog } from './extra-dialog';
import { OptionGroupDialog } from './option-group-dialog';

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 24, stiffness: 300 } },
};

export function ProductsClient() {
  const {
    products,
    isLoading,
    categories,
    expandedProduct,
    toggleExpanded,
    productDialogOpen,
    isEditing,
    form,
    setForm,
    imagePreview,
    openCreate,
    openEdit,
    handleSave,
    handleImageSelect,
    clearImage,
    saveMutation,
    uploading,
    toggleMutation,
    setProductDialogOpen,
    extraDialogOpen,
    isEditingExtra,
    extraForm,
    setExtraForm,
    openCreateExtra,
    openEditExtra,
    handleSaveExtra,
    deleteExtraMutation,
    saveExtraMutation,
    setExtraDialogOpen,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    // Option groups
    expandedGroup,
    toggleExpandedGroup,
    optionGroupDialogOpen,
    isEditingOptionGroup,
    optionGroupForm,
    setOptionGroupForm,
    openCreateOptionGroup,
    openEditOptionGroup,
    handleSaveOptionGroup,
    saveOptionGroupMutation,
    deleteOptionGroupMutation,
    setOptionGroupDialogOpen,
    // Group options
    groupOptionDialogOpen,
    isEditingGroupOption,
    groupOptionForm,
    setGroupOptionForm,
    openCreateGroupOption,
    openEditGroupOption,
    handleSaveGroupOption,
    saveGroupOptionMutation,
    deleteGroupOptionMutation,
    setGroupOptionDialogOpen,
  } = useProductsPage();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-[#2A1508]">Produtos</h1>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-[#6B3E14] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#5C2F10]"
        >
          <Plus className="h-4 w-4" />
          Novo Produto
        </motion.button>
      </div>

      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A6F40]" />
          <Input
            placeholder="Buscar produto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 rounded-xl border-[#EAD8A0] bg-[#FBF6E9] pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter('')}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors',
              !categoryFilter
                ? 'bg-[#6B3E14] text-white'
                : 'bg-[#FBF6E9] text-[#8A6F40] border border-[#EAD8A0] hover:bg-[#FDF7E3]',
            )}
          >
            Todos
          </button>
          {categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(categoryFilter === cat.id ? '' : cat.id)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors',
                categoryFilter === cat.id
                  ? 'bg-[#6B3E14] text-white'
                  : 'bg-[#FBF6E9] text-[#8A6F40] border border-[#EAD8A0] hover:bg-[#FDF7E3]',
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#6B3E14]" />
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {products?.map((product) => (
            <motion.div
              key={product.id}
              variants={itemVariants}
              className={cn(
                'overflow-hidden rounded-2xl border border-[#EAD8A0] bg-[#FBF6E9] shadow-[0_0_8px_rgba(60,40,20,0.12)]',
                'flex',
              )}
            >
              <div className={cn(
                'w-1 shrink-0',
                product.isActive ? 'bg-emerald-400' : 'bg-red-300',
              )} />

              <div className="flex-1 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {product.imageUrl ? (
                      <img
                        src={getImageUrl(product.imageUrl) || ''}
                        alt={product.name}
                        className="h-14 w-14 shrink-0 rounded-xl border border-[#EAD8A0] object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-[#EAD8A0] bg-[#FDF7E3]">
                        <ImagePlus className="h-5 w-5 text-[#EAD8A0]" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[#2A1508] truncate">{product.name}</h3>
                        <span className="shrink-0 rounded-full bg-[#FDF7E3] px-2 py-0.5 text-xs font-semibold text-[#8A6F40]">
                          {product.categoryName}
                        </span>
                        {product.isCompound && (
                          <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">
                            Composto
                          </span>
                        )}
                        {!product.isActive && (
                          <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                            Inativo
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#8A6F40]">
                        {formatCurrency(product.price)} · {product.isCompound ? `${product.optionGroups.length} grupos` : `${product.extras.length} extras`}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2 ml-2">
                    <button
                      onClick={() => toggleExpanded(product.id)}
                      className="rounded-lg border border-[#EAD8A0] p-2 text-[#8A6F40] transition-all hover:bg-[#FDF7E3]"
                    >
                      <motion.div
                        animate={{ rotate: expandedProduct === product.id ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </motion.div>
                    </button>
                    <button
                      onClick={() => openEdit(product)}
                      className="rounded-lg border border-[#EAD8A0] p-2 text-[#8A6F40] transition-colors hover:bg-[#FDF7E3] hover:text-[#6B3E14]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => toggleMutation.mutate(product.id)}
                      className={cn(
                        'rounded-lg border border-[#EAD8A0] p-2 transition-colors',
                        product.isActive
                          ? 'text-[#8A6F40] hover:bg-red-50 hover:text-red-600'
                          : 'text-emerald-500 hover:bg-emerald-50',
                      )}
                    >
                      <Power className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedProduct === product.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      {product.isCompound ? (
                        /* ─── Option Groups (compound product) ─── */
                        <div className="mt-4 border-t border-[#EAD8A0] pt-4">
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-widest text-[#7A4F1C]">
                              Grupos de Opções
                            </span>
                            <button
                              onClick={() => openCreateOptionGroup(product.id)}
                              className="flex items-center gap-1 rounded-lg border border-[#EAD8A0] px-3 py-1.5 text-xs font-semibold text-[#8A6F40] transition-colors hover:bg-[#FDF7E3]"
                            >
                              <Plus className="h-3 w-3" />
                              Grupo
                            </button>
                          </div>
                          {product.optionGroups.length === 0 ? (
                            <p className="text-sm text-[#8A6F40]">Nenhum grupo de opções criado</p>
                          ) : (
                            <div className="space-y-2">
                              {product.optionGroups.map((group) => (
                                <div key={group.id} className={cn('rounded-xl border border-[#EAD8A0] bg-[#FDF7E3] overflow-hidden', !group.isActive && 'opacity-50')}>
                                  <div className="flex items-center justify-between px-3 py-2.5">
                                    <button
                                      onClick={() => toggleExpandedGroup(group.id)}
                                      className="flex flex-1 items-center gap-2 text-left"
                                    >
                                      <motion.div animate={{ rotate: expandedGroup === group.id ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                        <ChevronDown className="h-3.5 w-3.5 text-[#8A6F40]" />
                                      </motion.div>
                                      <span className="text-sm font-semibold text-[#2A1508]">{group.name}</span>
                                      <span className="rounded-full bg-[#FBF6E9] px-2 py-0.5 text-[10px] font-bold text-[#8A6F40]">
                                        {group.minSelections >= 1 ? 'Obrigatório' : 'Opcional'} · {group.maxSelections === 1 ? 'Única' : `Até ${group.maxSelections}`}
                                      </span>
                                      <span className="text-xs text-[#8A6F40]">{group.options.length} opções</span>
                                    </button>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => openEditOptionGroup(group)}
                                        className="rounded-md p-1.5 text-[#8A6F40] transition-colors hover:bg-[#FBF6E9]"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={() => deleteOptionGroupMutation.mutate(group.id)}
                                        className="rounded-md p-1.5 text-[#8A6F40] transition-colors hover:bg-red-50 hover:text-red-600"
                                      >
                                        <Power className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                  <AnimatePresence>
                                    {expandedGroup === group.id && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="border-t border-[#EAD8A0] px-3 pb-3 pt-2">
                                          <div className="mb-2 flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A4F1C]">Opções</span>
                                            <button
                                              onClick={() => openCreateGroupOption(group.id)}
                                              className="flex items-center gap-1 rounded-md border border-[#EAD8A0] px-2 py-1 text-[10px] font-semibold text-[#8A6F40] transition-colors hover:bg-[#FBF6E9]"
                                            >
                                              <Plus className="h-2.5 w-2.5" />
                                              Opção
                                            </button>
                                          </div>
                                          {group.options.length === 0 ? (
                                            <p className="text-xs text-[#8A6F40]">Nenhuma opção</p>
                                          ) : (
                                            <div className="space-y-1.5">
                                              {group.options.map((opt) => (
                                                <div
                                                  key={opt.id}
                                                  className={cn(
                                                    'flex items-center justify-between rounded-lg border border-[#EAD8A0] bg-[#FBF6E9] px-2.5 py-1.5 text-xs',
                                                    !opt.isActive && 'opacity-50',
                                                  )}
                                                >
                                                  <span className="text-[#2A1508]">
                                                    {opt.name} — {opt.price > 0 ? formatCurrency(opt.price) : 'Incluso'}
                                                  </span>
                                                  <div className="flex gap-1">
                                                    <button
                                                      onClick={() => openEditGroupOption(opt)}
                                                      className="rounded p-1 text-[#8A6F40] transition-colors hover:bg-[#FDF7E3]"
                                                    >
                                                      <Pencil className="h-2.5 w-2.5" />
                                                    </button>
                                                    <button
                                                      onClick={() => deleteGroupOptionMutation.mutate(opt.id)}
                                                      className="rounded p-1 text-[#8A6F40] transition-colors hover:bg-red-50 hover:text-red-600"
                                                    >
                                                      <Power className="h-2.5 w-2.5" />
                                                    </button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* ─── Flat Extras (non-compound) ─── */
                        <div className="mt-4 border-t border-[#EAD8A0] pt-4">
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-widest text-[#7A4F1C]">
                              Adicionais
                            </span>
                            <button
                              onClick={() => openCreateExtra(product.id)}
                              className="flex items-center gap-1 rounded-lg border border-[#EAD8A0] px-3 py-1.5 text-xs font-semibold text-[#8A6F40] transition-colors hover:bg-[#FDF7E3]"
                            >
                              <Plus className="h-3 w-3" />
                              Adicional
                            </button>
                          </div>
                          {product.extras.length === 0 ? (
                            <p className="text-sm text-[#8A6F40]">Sem adicionais</p>
                          ) : (
                            <div className="space-y-2">
                              {product.extras.map((extra) => (
                                <div
                                  key={extra.id}
                                  className={cn(
                                    'flex items-center justify-between rounded-xl border border-[#EAD8A0] bg-[#FDF7E3] px-3 py-2 text-sm',
                                    !extra.isActive && 'opacity-50',
                                  )}
                                >
                                  <span className="text-[#2A1508]">
                                    {extra.name} — {formatCurrency(extra.price)}
                                  </span>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => openEditExtra(extra)}
                                      className="rounded-md p-1.5 text-[#8A6F40] transition-colors hover:bg-[#FBF6E9]"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => deleteExtraMutation.mutate(extra.id)}
                                      className="rounded-md p-1.5 text-[#8A6F40] transition-colors hover:bg-red-50 hover:text-red-600"
                                    >
                                      <Power className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <ProductDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        isEditing={isEditing}
        form={form}
        setForm={setForm}
        categories={categories}
        imagePreview={imagePreview}
        onImageSelect={handleImageSelect}
        onClearImage={clearImage}
        onSave={handleSave}
        isPending={saveMutation.isPending}
        uploading={uploading}
      />

      <ExtraDialog
        open={extraDialogOpen}
        onOpenChange={setExtraDialogOpen}
        isEditing={isEditingExtra}
        form={extraForm}
        setForm={setExtraForm}
        onSave={handleSaveExtra}
        isPending={saveExtraMutation.isPending}
      />

      <OptionGroupDialog
        open={optionGroupDialogOpen}
        onOpenChange={setOptionGroupDialogOpen}
        isEditing={isEditingOptionGroup}
        form={optionGroupForm}
        setForm={setOptionGroupForm}
        onSave={handleSaveOptionGroup}
        isPending={saveOptionGroupMutation.isPending}
      />

      <ExtraDialog
        open={groupOptionDialogOpen}
        onOpenChange={setGroupOptionDialogOpen}
        isEditing={isEditingGroupOption}
        form={groupOptionForm}
        setForm={setGroupOptionForm}
        onSave={handleSaveGroupOption}
        isPending={saveGroupOptionMutation.isPending}
      />
    </div>
  );
}
