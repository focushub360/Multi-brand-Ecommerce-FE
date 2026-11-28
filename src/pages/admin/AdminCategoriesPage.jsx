
import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

import {
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  addSubcategory,
  syncAdminDataFromApi,
  fetchAdminCategoriesFromApi
} from '../../services/adminService';

import {
  Layers,
  Plus,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronRight,
  Tag,
  Pencil,
  Trash2,
  Power,
  Image as ImageIcon,
  Sprout,
  Smartphone,
  Cog,
  ShoppingBasket,
  Package,
  Wheat,
  Cpu,
  Car,
  Wrench,
  Shield,
  Zap,
  Sparkles,
  Heart,
  Shirt,
  Sun
} from 'lucide-react';

const ICON_COMPONENTS = {
  Sprout,
  Smartphone,
  Cog,
  ShoppingBasket,
  Package,
  Wheat,
  Cpu,
  Car,
  Wrench,
  Shield,
  Zap,
  Sparkles,
  Heart,
  Shirt,
  Sun,
  Layers
};

const ICON_PRESETS = [
  'Sprout',
  'Smartphone',
  'Cog',
  'ShoppingBasket',
  'Package',
  'Wheat',
  'Cpu',
  'Car',
  'Wrench',
  'Shield',
  'Zap',
  'Sparkles',
  'Heart',
  'Shirt',
  'Sun',
  'Layers'
];

function renderCategoryIcon(iconName, className = 'w-4 h-4 text-[#0E5138]') {
  if (!iconName) return <Layers className={className} />;
  const key = Object.keys(ICON_COMPONENTS).find(
    (k) => k.toLowerCase() === String(iconName).trim().toLowerCase()
  );
  const IconComp = key ? ICON_COMPONENTS[key] : Layers;
  return <IconComp className={className} />;
}

// Initial category form
const initialCategoryForm = {
  name: '',
  slug: '',
  description: '',
  image: '',
  images: [],
  icon: 'Layers',
  commissionRate: 5,
  status: 'Active',
  subcategories: []
};

// Initial subcategory form
const initialSubcategoryForm = {
  name: '',
  slug: ''
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [expandedCat, setExpandedCat] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal states
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  const [targetCatId, setTargetCatId] = useState(null);

  // Form states
  const [catForm, setCatForm] = useState(initialCategoryForm);
  const [subForm, setSubForm] = useState(initialSubcategoryForm);
  const [subInput, setSubInput] = useState('');

  // Add subcategory chip inside category modal
  const handleAddSubcategoryChip = (e) => {
    if (e) e.preventDefault();
    const val = subInput.trim();
    if (!val) return;
    if (catForm.subcategories.some((s) => s.name.toLowerCase() === val.toLowerCase())) {
      showToast('Subcategory already added.');
      return;
    }
    const slug = generateSlug(val);
    setCatForm((prev) => ({
      ...prev,
      subcategories: [...prev.subcategories, { name: val, slug }]
    }));
    setSubInput('');
  };

  // Remove subcategory chip
  const handleRemoveSubcategoryChip = (indexToRemove) => {
    setCatForm((prev) => ({
      ...prev,
      subcategories: prev.subcategories.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Generate URL-friendly slug
  const generateSlug = (value = '') => {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // Show toast message
  const showToast = (message) => {
    setToastMessage(message);

    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  // Get error message from API
  const getErrorMessage = (error, fallback) => {
    return (
      error?.response?.data?.message ||
      error?.message ||
      fallback
    );
  };

  // Load categories directly from backend MongoDB
  const loadData = async () => {
    try {
      const categoryList = await fetchAdminCategoriesFromApi();
      setCategories(categoryList);
      return categoryList;
    } catch (error) {
      console.error('Admin category loading error:', error);
      const fallback = getAdminCategories();
      setCategories(fallback);
      return fallback;
    }
  };


  // Initial page loading
  useEffect(() => {
    document.title = 'Category Management | GROVE Admin';
    window.scrollTo(0, 0);

    const initializePage = async () => {
      setIsLoading(true);

      try {
        await syncAdminDataFromApi();

        const categoryList = await loadData();

        if (categoryList.length > 0) {
          setExpandedCat(categoryList[0].id);
        }
      } catch (error) {
        showToast(getErrorMessage(error, 'Unable to sync categories.'));
      } finally {
        setIsLoading(false);
      }
    };

    initializePage();
  }, []);

  // Open category modal
  const openCategoryModal = () => {
    setCatForm({ ...initialCategoryForm });
    setIsCatModalOpen(true);
  };

  // Close category modal
  const closeCategoryModal = () => {
    if (isSubmitting) return;

    setIsCatModalOpen(false);
    setCatForm({ ...initialCategoryForm });
    setSubInput('');
  };

  // Handle category creation
  const handleCreateCategory = async (e) => {
    e.preventDefault();

    if (!catForm.name.trim()) {
      showToast('Category name is required.');
      return;
    }

    if (!catForm.slug.trim()) {
      showToast('Category slug is required.');
      return;
    }

    if (!catForm.image.trim()) {
      showToast('Category image URL is required.');
      return;
    }

    const allImages = [
      catForm.image.trim(),
      ...(catForm.images || []).filter((u) => Boolean(u && u.trim()))
    ].filter((v, i, a) => a.indexOf(v) === i);

    const payload = {
      name: catForm.name.trim(),
      slug: generateSlug(catForm.slug || catForm.name),
      description: catForm.description.trim(),
      image: catForm.image.trim(),
      images: allImages,
      icon: catForm.icon.trim() || 'Layers',
      commissionRate: Number(catForm.commissionRate) || 0,
      status: catForm.status || 'Active',
      subcategories: catForm.subcategories || []
    };

    try {
      setIsSubmitting(true);

      await createAdminCategory(payload);

      await loadData();

      setIsCatModalOpen(false);
      setCatForm({ ...initialCategoryForm });
      setSubInput('');

      showToast('Category created successfully.');
    } catch (error) {
      showToast(
        getErrorMessage(error, 'Unable to create category.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle subcategory creation
  const handleCreateSubcategory = async (e) => {
    e.preventDefault();

    if (!subForm.name.trim() || !targetCatId) {
      showToast('Subcategory name is required.');
      return;
    }

    const payload = {
      name: subForm.name.trim(),
      slug: generateSlug(subForm.slug || subForm.name)
    };

    try {
      setIsSubmitting(true);

      await addSubcategory(targetCatId, payload);

      await loadData();

      setIsSubModalOpen(false);
      setSubForm({ ...initialSubcategoryForm });
      setTargetCatId(null);

      showToast('Subcategory added successfully.');
    } catch (error) {
      showToast(
        getErrorMessage(error, 'Unable to add subcategory.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete category
  const handleDeleteCategory = async (id, e) => {
    if (e) e.stopPropagation();

    if (!id) {
      showToast('Category ID is missing.');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to delete this category?'
    );

    if (!confirmed) return;

    try {
      await deleteAdminCategory(id);

      await loadData();

      showToast('Category deleted successfully.');
    } catch (error) {
      showToast(
        getErrorMessage(error, 'Unable to delete category.')
      );
    }
  };

  // Edit category name
  const handleEditCategory = async (category, e) => {
    e.stopPropagation();

    const name = window
      .prompt('Update category name:', category.name)
      ?.trim();

    if (!name || name === category.name) return;

    try {
      await updateAdminCategory(category.id, {
        name,
        slug: generateSlug(name)
      });

      await loadData();

      showToast('Category updated successfully.');
    } catch (error) {
      showToast(
        getErrorMessage(error, 'Unable to update category.')
      );
    }
  };

  // Activate or deactivate category
  const handleToggleCategory = async (category, e) => {
    e.stopPropagation();

    const newStatus =
      category.status === 'Inactive' ? 'Active' : 'Inactive';

    try {
      await updateAdminCategory(category.id, {
        status: newStatus
      });

      await loadData();

      showToast(`Category ${newStatus.toLowerCase()} successfully.`);
    } catch (error) {
      showToast(
        getErrorMessage(error, 'Unable to update category status.')
      );
    }
  };

  // Open subcategory modal
  const openSubcategoryModal = (categoryId, e) => {
    e.stopPropagation();

    setTargetCatId(categoryId);
    setSubForm({ ...initialSubcategoryForm });
    setIsSubModalOpen(true);
  };

  return (
    <AdminLayout>
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#012D1D] text-white text-xs font-semibold shadow-xl border border-[#AEEECB]/40">
          <CheckCircle2 className="w-4 h-4 text-[#AEEECB] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page header */}
      <AdminPageHeader
        title="Category Taxonomy Management"
        subtitle="Manage categories, subcategories, commission rates, and category status."
        badge={`${categories.length} Primary Categories`}
        breadcrumbs={[{ label: 'Categories' }]}
        actions={
          <button
            type="button"
            onClick={openCategoryModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#012D1D] hover:bg-[#1B4332] text-white text-xs font-bold transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-[#AEEECB]" />
            <span>New Primary Category</span>
          </button>
        }
      />

      {/* Category list */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-3xl border p-8 text-center text-sm text-gray-500">
            Loading categories...
          </div>
        ) : categories.length === 0 ? (
          <div className="bg-white rounded-3xl border p-8 text-center">
            <Layers className="w-10 h-10 mx-auto mb-3 text-gray-400" />
            <h3 className="font-bold text-[#012D1D]">
              No categories found
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Create your first category to get started.
            </p>
          </div>
        ) : (
          categories.map((cat) => {
            const isExpanded = expandedCat === cat.id;

            return (
              <div
                key={cat.id}
                className="bg-white rounded-3xl border border-[#C1C8C2]/60 shadow-xs overflow-hidden"
              >
                {/* Category header */}
                <div
                  onClick={() =>
                    setExpandedCat(isExpanded ? null : cat.id)
                  }
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-[#F8FAF8]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#012D1D] shrink-0 flex items-center justify-center">
                      {cat.image ? (
                        <img
                          src={cat.image}
                          alt={cat.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Layers className="w-5 h-5 text-[#AEEECB]" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-6 h-6 rounded-lg bg-[#E8F5E9] flex items-center justify-center shrink-0" title={`Icon: ${cat.icon || 'Layers'}`}>
                          {renderCategoryIcon(cat.icon, 'w-3.5 h-3.5 text-[#0E5138]')}
                        </div>

                        <h3 className="font-extrabold text-base text-[#012D1D]">
                          {cat.name}
                        </h3>

                        <span className="px-2 py-0.5 rounded-full bg-[#AEEECB] text-[#0E5138] font-bold text-[10px]">
                          {cat.productCount || 0} SKUs
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cat.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {cat.status || 'Active'}
                        </span>
                      </div>

                      <p className="text-xs text-[#717973] mt-1 line-clamp-1">
                        {cat.description || 'No description'}
                      </p>

                      <p className="text-[10px] text-gray-400 mt-1">
                        Slug: {cat.slug}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                    <div className="text-right mr-2">
                      <span className="text-[10px] uppercase text-[#717973] block">
                        Platform Commission
                      </span>
                      <span className="font-mono text-xs font-bold text-[#0E5138] bg-[#F3FCF3] px-2 py-1 rounded border">
                        {cat.commissionRate ?? 0}%
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => openSubcategoryModal(cat.id, e)}
                      className="px-2.5 py-1.5 rounded-xl bg-white border text-xs font-bold text-[#012D1D] hover:bg-[#F3FCF3] flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add Subcategory
                    </button>

                    <button
                      type="button"
                      title="Edit category name"
                      onClick={(e) => handleEditCategory(cat, e)}
                      className="p-2 rounded-lg border hover:bg-[#F3FCF3]"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      title={
                        cat.status === 'Inactive'
                          ? 'Activate category'
                          : 'Deactivate category'
                      }
                      onClick={(e) => handleToggleCategory(cat, e)}
                      className="p-2 rounded-lg border hover:bg-[#F3FCF3]"
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      title="Delete category"
                      onClick={(e) => handleDeleteCategory(cat.id, e)}
                      className="p-2 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </div>

                {/* Subcategory accordion */}
                {isExpanded && (
                  <div className="p-5 bg-[#F8FAF8] border-t border-[#C1C8C2]/40 space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#717973] block">
                      Subcategories ({cat.subcategories?.length || 0})
                    </span>

                    {cat.subcategories?.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {cat.subcategories.map((sub) => (
                          <div
                            key={sub.id || sub._id || sub.slug}
                            className="p-3.5 rounded-2xl bg-white border border-[#C1C8C2]/40 flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Tag className="w-4 h-4 text-[#2C694E] shrink-0" />

                              <div className="min-w-0">
                                <span className="font-bold text-xs text-[#151D18] block">
                                  {sub.name}
                                </span>
                                <span className="text-[10px] text-[#717973]">
                                  slug: {sub.slug}
                                </span>
                              </div>
                            </div>

                            <span className="font-mono text-[11px] font-bold text-[#012D1D] bg-[#F3FCF3] px-2 py-1 rounded">
                              {sub.productCount || 0} items
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">
                        No subcategories added yet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create category modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-[#012D1D]/50 backdrop-blur-xs"
            onClick={closeCategoryModal}
          />

          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-3xl border border-[#C1C8C2]/70 shadow-2xl p-6 z-10">
            <div className="flex items-center justify-between pb-3 mb-4 border-b">
              <div>
                <h3 className="font-extrabold text-base text-[#012D1D]">
                  Create Primary Category
                </h3>
                
              </div>

              <button
                type="button"
                onClick={closeCategoryModal}
                className="p-1 rounded-xl text-[#717973]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateCategory}
              className="space-y-4 text-xs"
            >
              {/* Category name */}
              <div>
                <label className="block font-bold text-[#3F4943] mb-1">
                  Category Title *
                </label>

                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={catForm.name}
                  onChange={(e) => {
                    const name = e.target.value;

                    setCatForm((prev) => ({
                      ...prev,
                      name,
                      slug: generateSlug(name)
                    }));
                  }}
                  placeholder="e.g. Agriculture"
                  className="w-full h-10 px-3 rounded-xl bg-[#F8FAF8] border border-[#C1C8C2]/60"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block font-bold text-[#3F4943] mb-1">
                  Category Slug *
                </label>

                <input
                  type="text"
                  required
                  value={catForm.slug}
                  onChange={(e) =>
                    setCatForm((prev) => ({
                      ...prev,
                      slug: generateSlug(e.target.value)
                    }))
                  }
                  placeholder="agriculture"
                  className="w-full h-10 px-3 rounded-xl bg-[#F8FAF8] border border-[#C1C8C2]/60"
                />

                <p className="text-[10px] text-gray-400 mt-1">
                  Automatically generated from the category title.
                </p>
              </div>

              {/* Image URL */}
              <div>
                <label className="block font-bold text-[#3F4943] mb-1">
                  Category Image URL *
                </label>

                <input
                  type="url"
                  required
                  value={catForm.image}
                  onChange={(e) =>
                    setCatForm((prev) => ({
                      ...prev,
                      image: e.target.value
                    }))
                  }
                  placeholder="https://images.unsplash.com/... or /images/..."
                  className="w-full h-10 px-3 rounded-xl bg-[#F8FAF8] border border-[#C1C8C2]/60"
                />

                {catForm.image && (
                  <div className="mt-2 w-full h-28 rounded-xl overflow-hidden bg-gray-100 border relative">
                    <img
                      src={catForm.image}
                      alt="Category preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Icon Picker */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-[#3F4943]">
                    Category Icon
                  </label>
                  <span className="text-[10px] text-gray-500 flex items-center gap-1.5">
                    Selected: <span className="font-semibold text-[#0E5138]">{catForm.icon || 'Layers'}</span>
                    <span className="w-5 h-5 rounded-md bg-[#E8F5E9] inline-flex items-center justify-center">
                      {renderCategoryIcon(catForm.icon, 'w-3 h-3 text-[#0E5138]')}
                    </span>
                  </span>
                </div>

                <div className="grid grid-cols-8 gap-1.5 p-2 bg-[#F8FAF8] rounded-xl border border-[#C1C8C2]/60 mb-2">
                  {ICON_PRESETS.map((iconName) => {
                    const isSelected = (catForm.icon || '').toLowerCase() === iconName.toLowerCase();
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setCatForm((prev) => ({ ...prev, icon: iconName }))}
                        title={iconName}
                        className={`p-1.5 rounded-lg flex flex-col items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-[#012D1D] text-[#AEEECB] shadow-xs'
                            : 'bg-white hover:bg-[#E8F5E9] text-[#2C694E] border border-gray-100'
                        }`}
                      >
                        {renderCategoryIcon(iconName, `w-4 h-4 ${isSelected ? 'text-[#AEEECB]' : 'text-[#2C694E]'}`)}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  value={catForm.icon}
                  onChange={(e) =>
                    setCatForm((prev) => ({
                      ...prev,
                      icon: e.target.value
                    }))
                  }
                  placeholder="Or enter custom icon name (e.g. Sprout, Smartphone, Cog)"
                  className="w-full h-9 px-3 rounded-xl bg-[#F8FAF8] border border-[#C1C8C2]/60 text-xs"
                />
              </div>

              {/* Subcategories Builder */}
              <div>
                <label className="block font-bold text-[#3F4943] mb-1">
                  Subcategories ({catForm.subcategories?.length || 0})
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={subInput}
                    onChange={(e) => setSubInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubcategoryChip();
                      }
                    }}
                    placeholder="Type subcategory (e.g. Organic Seeds) & press Enter"
                    className="flex-1 h-9 px-3 rounded-xl bg-[#F8FAF8] border border-[#C1C8C2]/60 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubcategoryChip}
                    className="px-3 h-9 rounded-xl bg-[#012D1D] text-white font-bold text-xs hover:bg-[#1B4332] shrink-0"
                  >
                    Add
                  </button>
                </div>

                {catForm.subcategories?.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-2.5 p-2 bg-[#F8FAF8] rounded-xl border border-[#C1C8C2]/40 max-h-28 overflow-y-auto">
                    {catForm.subcategories.map((sub, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#C1C8C2]/60 text-[11px] font-semibold text-[#151D18]"
                      >
                        <Tag className="w-3 h-3 text-[#2C694E]" />
                        <span>{sub.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubcategoryChip(idx)}
                          className="hover:text-rose-600 text-gray-400 ml-0.5"
                          title="Remove"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-400 mt-1">
                    Optional: add subcategories directly now, or later anytime.
                  </p>
                )}
              </div>

              {/* Commission */}
              <div>
                <label className="block font-bold text-[#3F4943] mb-1">
                  Commission Rate (%) *
                </label>

                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.1"
                  value={catForm.commissionRate}
                  onChange={(e) =>
                    setCatForm((prev) => ({
                      ...prev,
                      commissionRate: e.target.value
                    }))
                  }
                  className="w-full h-10 px-3 rounded-xl bg-[#F8FAF8] border border-[#C1C8C2]/60"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-[#3F4943] mb-1">
                  Description
                </label>

                <textarea
                  rows={2}
                  maxLength={1000}
                  value={catForm.description}
                  onChange={(e) =>
                    setCatForm((prev) => ({
                      ...prev,
                      description: e.target.value
                    }))
                  }
                  placeholder="Enter category description..."
                  className="w-full p-3 rounded-xl bg-[#F8FAF8] border border-[#C1C8C2]/60 resize-none"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block font-bold text-[#3F4943] mb-1">
                  Status *
                </label>

                <select
                  required
                  value={catForm.status}
                  onChange={(e) =>
                    setCatForm((prev) => ({
                      ...prev,
                      status: e.target.value
                    }))
                  }
                  className="w-full h-10 px-3 rounded-xl bg-[#F8FAF8] border border-[#C1C8C2]/60"
                >
                  <option value="Active">Active (Visible on Storefront & Homepage)</option>
                  <option value="Inactive">Inactive (Hidden from Customers)</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={closeCategoryModal}
                  className="px-4 py-2.5 rounded-xl bg-white border border-[#C1C8C2]/60 font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#012D1D] text-white font-bold disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add subcategory modal */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-[#012D1D]/50 backdrop-blur-xs"
            onClick={() => {
              if (!isSubmitting) setIsSubModalOpen(false);
            }}
          />

          <div className="relative w-full max-w-md bg-white rounded-3xl border border-[#C1C8C2]/70 shadow-2xl p-6 z-10">
            <div className="flex items-center justify-between pb-3 mb-4 border-b">
              <h3 className="font-extrabold text-base text-[#012D1D]">
                Add Subcategory
              </h3>

              <button
                type="button"
                onClick={() => setIsSubModalOpen(false)}
                className="p-1 rounded-xl text-[#717973]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateSubcategory}
              className="space-y-4 text-xs"
            >
              {/* Subcategory name */}
              <div>
                <label className="block font-bold text-[#3F4943] mb-1">
                  Subcategory Title *
                </label>

                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={subForm.name}
                  onChange={(e) => {
                    const name = e.target.value;

                    setSubForm({
                      name,
                      slug: generateSlug(name)
                    });
                  }}
                  placeholder="e.g. Drip Irrigation"
                  className="w-full h-10 px-3 rounded-xl bg-[#F8FAF8] border border-[#C1C8C2]/60"
                />
              </div>

              {/* Subcategory slug */}
              <div>
                <label className="block font-bold text-[#3F4943] mb-1">
                  Subcategory Slug *
                </label>

                <input
                  type="text"
                  required
                  value={subForm.slug}
                  onChange={(e) =>
                    setSubForm((prev) => ({
                      ...prev,
                      slug: generateSlug(e.target.value)
                    }))
                  }
                  placeholder="drip-irrigation"
                  className="w-full h-10 px-3 rounded-xl bg-[#F8FAF8] border border-[#C1C8C2]/60"
                />
              </div>

              <p className="text-[10px] text-gray-500">
                Subcategories do not have a separate image.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsSubModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white border border-[#C1C8C2]/60 font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#012D1D] text-white font-bold disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Add Subcategory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
