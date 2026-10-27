import React, { useEffect, useState, useCallback } from 'react';
import {
  SafeAreaView, View, Text, TextInput, FlatList, Image, ScrollView, Pressable,
  ActivityIndicator, StyleSheet, Alert, Platform, StatusBar, BackHandler,
  useWindowDimensions,
} from 'react-native';

/* =====================================================================
   API FUNCTIONS (all use fetch)
   ===================================================================== */
const BASE_URL = 'https://dummyjson.com';
const DEFAULT_CATEGORY = 'motorcycle'; // change this to load different default products

// 1. Fetch API: shared wrapper (JSON headers, res.ok check, readable errors)
async function fetchAPI(path, options = {}) {
  const res = await fetch(BASE_URL + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

// 2. Get all products (optionally by category)
const getAllProducts = (category) =>
  fetchAPI(category ? `/products/category/${category}` : '/products?limit=30');

// 3. Search products
const searchProducts = (q) => fetchAPI(`/products/search?q=${encodeURIComponent(q)}`);

// 4. Single product
const getSingleProduct = (id) => fetchAPI(`/products/${id}`);

// 5. Add product (POST)
const addProduct = (body) =>
  fetchAPI('/products/add', { method: 'POST', body: JSON.stringify(body) });

// 6. Update product (PUT)
const updateProduct = (id, body) =>
  fetchAPI(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) });

// 7. Delete product (DELETE)
const deleteProduct = (id) => fetchAPI(`/products/${id}`, { method: 'DELETE' });

/* =====================================================================
   HELPERS + THEME
   ===================================================================== */
const C = {
  bg: '#f6f3ee', card: '#ffffff', ink: '#1c1c1a', muted: '#7a766e',
  line: '#e4dfd6', green: '#1f4d3a', soft: '#e3ece6', danger: '#b3261e',
};
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const money = (n) => `$${Number(n).toFixed(2)}`;
const stars = (r = 0) => '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));
const fmt = (v) =>
  v && typeof v === 'object'
    ? Object.entries(v).map(([k, x]) => `${k}: ${x}`).join(', ')
    : String(v);
const SHOWN_ELSEWHERE = [
  'meta', '_local', 'images', 'thumbnail', 'reviews', 'tags',
  'title', 'description', 'price', 'discountPercentage', 'rating', 'stock',
];

/* =====================================================================
   LIST ITEM (preview)
   ===================================================================== */
function ProductRow({ item, onPress }) {
  return (
    <Pressable onPress={() => onPress(item)} style={styles.row}>
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, { backgroundColor: C.soft }]} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowCat}>{(item.category || 'product').toUpperCase()}</Text>
        <Text numberOfLines={2} style={styles.rowTitle}>{item.title}</Text>
        <View style={styles.inline}>
          <Text style={styles.rowPrice}>{money(item.price)}</Text>
          {item.discountPercentage ? (
            <Text style={styles.off}>{Math.round(item.discountPercentage)}% off</Text>
          ) : null}
        </View>
        <Text style={styles.muted}>★ {item.rating ?? '-'}   ·   {item.stock ?? 0} in stock</Text>
        {item._local && <Text style={styles.localTag}>added locally</Text>}
      </View>
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

/* =====================================================================
   DETAIL SCREEN
   ===================================================================== */
function DetailScreen({ product, loading, busy, onBack, onEdit, onDelete }) {
  const { width } = useWindowDimensions();
  const [imgIndex, setImgIndex] = useState(0);
  const infoRows = Object.entries(product).filter(([k]) => !SHOWN_ELSEWHERE.includes(k));
  const original = product.discountPercentage
    ? product.price / (1 - product.discountPercentage / 100)
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView>
        <View style={{ backgroundColor: C.soft }}>
          {/* gallery: mapping the images array */}
          {product.images?.length ? (
            <FlatList
              data={product.images}
              keyExtractor={(uri, i) => uri + i}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setImgIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
              renderItem={({ item: uri }) => (
                <Image source={{ uri }} style={{ width, height: width * 0.95 }} resizeMode="contain" />
              )}
            />
          ) : product.thumbnail ? (
            <Image source={{ uri: product.thumbnail }} style={{ width, height: width * 0.95 }} resizeMode="contain" />
          ) : (
            <View style={{ width, height: 220 }} />
          )}
          {product.images?.length > 1 && (
            <Text style={styles.counter}>{imgIndex + 1} / {product.images.length}</Text>
          )}
          <Pressable onPress={onBack} style={styles.floatBack}>
            <Text style={styles.floatBackText}>‹</Text>
          </Pressable>
        </View>

        {/* rounded sheet over the image */}
        <View style={styles.sheet}>
          {loading && <ActivityIndicator color={C.green} style={{ marginBottom: 8 }} />}
          <Text style={styles.rowCat}>{(product.category || 'product').toUpperCase()}</Text>
          <Text style={styles.detailTitle}>{product.title}</Text>

          <View style={[styles.inline, { marginTop: 6 }]}>
            <Text style={styles.bigPrice}>{money(product.price)}</Text>
            {original && <Text style={styles.strike}>{money(original)}</Text>}
            {product.discountPercentage ? (
              <Text style={styles.off}>{Math.round(product.discountPercentage)}% off</Text>
            ) : null}
          </View>
          <Text style={[styles.muted, { marginTop: 4 }]}>
            <Text style={{ color: C.green }}>{stars(product.rating)}</Text>  {product.rating}   ·   {product.stock} in stock
          </Text>

          {/* mapping the tags array */}
          <View style={styles.tagRow}>
            {(product.tags || []).map((t) => (
              <Text key={t} style={styles.tag}>{t}</Text>
            ))}
          </View>

          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.body}>{product.description}</Text>

          {/* every remaining field except meta */}
          <Text style={styles.sectionTitle}>Details</Text>
          {infoRows.map(([k, v]) => (
            <View key={k} style={styles.infoRow}>
              <Text style={styles.infoKey}>{k}</Text>
              <Text style={styles.infoVal}>{fmt(v)}</Text>
            </View>
          ))}

          {/* mapping the reviews array */}
          <Text style={styles.sectionTitle}>Reviews ({(product.reviews || []).length})</Text>
          {(product.reviews || []).map((r, i) => (
            <View key={r.reviewerEmail + i} style={styles.review}>
              <View style={styles.inline}>
                <Text style={styles.reviewName}>{r.reviewerName}</Text>
                <Text style={{ color: C.green, marginLeft: 8 }}>{stars(r.rating)}</Text>
              </View>
              <Text style={styles.body}>{r.comment}</Text>
              <Text style={styles.muted}>{r.date ? new Date(r.date).toDateString() : ''}</Text>
            </View>
          ))}
          {!(product.reviews || []).length && <Text style={styles.muted}>No reviews yet.</Text>}
          <View style={{ height: 90 }} />
        </View>
      </ScrollView>

      {/* floating action pills */}
      <View style={styles.actions}>
        {busy ? (
          <ActivityIndicator color={C.green} />
        ) : (
          <>
            <Pressable style={[styles.pill, styles.pillGhost]} onPress={onEdit}>
              <Text style={[styles.pillText, { color: C.green }]}>Edit (PUT)</Text>
            </Pressable>
            <Pressable style={[styles.pill, { backgroundColor: C.danger }]} onPress={onDelete}>
              <Text style={styles.pillText}>Delete</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

/* =====================================================================
   ADD / EDIT FORM
   ===================================================================== */
function FormScreen({ existing, onBack, onSave }) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [price, setPrice] = useState(existing ? String(existing.price) : '');
  const [stock, setStock] = useState(existing?.stock != null ? String(existing.stock) : '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const valid = title.trim() && price.trim() && !isNaN(Number(price));

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = { title, description, price: Number(price) };
      if (stock.trim() && !isNaN(Number(stock))) body.stock = Number(stock);
      await onSave(body); // parent performs POST or PUT
    } catch (e) {
      setError((existing ? 'PUT' : 'POST') + ' failed: ' + e.message);
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.formTop}>
        <Pressable onPress={onBack} style={styles.roundBtn}><Text style={styles.floatBackText}>‹</Text></Pressable>
        <Text style={styles.formHeading}>{existing ? `Edit product #${existing.id}` : 'New product'}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.label}>TITLE</Text>
        <TextInput style={styles.field} value={title} onChangeText={setTitle} placeholder="e.g. Leather Jacket" placeholderTextColor={C.muted} />
        <Text style={styles.label}>PRICE</Text>
        <TextInput style={styles.field} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="0.00" placeholderTextColor={C.muted} />
        <Text style={styles.label}>STOCK (OPTIONAL)</Text>
        <TextInput style={styles.field} value={stock} onChangeText={setStock} keyboardType="numeric" placeholder="0" placeholderTextColor={C.muted} />
        <Text style={styles.label}>DESCRIPTION</Text>
        <TextInput style={[styles.field, { height: 100, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} multiline placeholder="Write something..." placeholderTextColor={C.muted} />
        {error && <Text style={styles.error}>{error}</Text>}
        {saving ? (
          <ActivityIndicator color={C.green} style={{ marginTop: 20 }} />
        ) : (
          <Pressable style={[styles.pill, { backgroundColor: C.green, marginTop: 24 }, !valid && { opacity: 0.4 }]} disabled={!valid} onPress={submit}>
            <Text style={styles.pillText}>{existing ? 'Save changes (PUT)' : 'Create product (POST)'}</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

/* =====================================================================
   MAIN APP
   ===================================================================== */
export default function App() {
  const [screen, setScreen] = useState('home'); // home | detail | form
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([DEFAULT_CATEGORY]);
  const [category, setCategory] = useState(DEFAULT_CATEGORY); // null = all
  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [log, setLog] = useState('');

  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);

  // GET all / search
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = query ? await searchProducts(query) : await getAllProducts(category);
      setProducts(data.products);
      setLog(query
        ? `GET /products/search?q=${query} -> ${data.products.length} items`
        : `GET ${category ? '/products/category/' + category : '/products'} -> ${data.products.length} items`);
    } catch (e) {
      setError('GET failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [query, category]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => {
    fetchAPI('/products/category-list')
      .then((list) => Array.isArray(list) && setCategories(list))
      .catch(() => {});
  }, []);

  // Android back button
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'home') return false;
      setScreen(screen === 'form' && editing ? 'detail' : 'home');
      return true;
    });
    return () => sub.remove();
  }, [screen, editing]);

  // GET single: preview shows instantly, then the full record loads
  const openProduct = async (item) => {
    setSelected(item);
    setScreen('detail');
    if (item._local) return; // doesn't exist on the server
    setDetailLoading(true);
    try {
      const full = await getSingleProduct(item.id);
      setSelected(full);
      setLog(`GET /products/${item.id}`);
    } catch (e) {
      Alert.alert('GET failed', e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  // POST or PUT (called by the form; errors display inside the form)
  const saveProduct = async (body) => {
    if (editing) {
      let updated;
      if (editing._local) {
        updated = { ...editing, ...body };
        setLog(`PUT skipped for local item ${editing.id} (not on server) -> updated locally`);
      } else {
        updated = await updateProduct(editing.id, body);
        setLog(`PUT /products/${editing.id} -> ${JSON.stringify(updated)}`);
      }
      const merged = { ...editing, ...selected, ...updated };
      setProducts((prev) => prev.map((p) => (p.id === merged.id ? merged : p)));
      setSelected(merged);
      setScreen('detail');
    } else {
      const created = await addProduct({ ...body, ...(category ? { category } : {}) });
      setProducts((prev) => [{ ...created, _local: true }, ...prev]); // API doesn't persist
      setLog(`POST /products/add -> ${JSON.stringify(created)}`);
      setScreen('home');
    }
  };

  // DELETE
  const confirmDelete = (item) =>
    Alert.alert('Delete product', `Remove "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            if (item._local) {
              setLog(`DELETE skipped for local item ${item.id} -> removed locally`);
            } else {
              const res = await deleteProduct(item.id);
              setLog(`DELETE /products/${item.id} -> isDeleted: ${res.isDeleted}`);
            }
            setProducts((prev) => prev.filter((p) => p.id !== item.id));
            setScreen('home');
          } catch (e) {
            Alert.alert('DELETE failed', e.message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  const openForm = (product) => { setEditing(product); setScreen('form'); };
  const submitSearch = () => setQuery(searchText.trim());
  const clearSearch = () => { setSearchText(''); setQuery(''); };
  const pickCategory = (c) => { clearSearch(); setCategory(c); };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {screen === 'detail' && selected && (
        <DetailScreen
          product={selected}
          loading={detailLoading}
          busy={busy}
          onBack={() => setScreen('home')}
          onEdit={() => openForm(selected)}
          onDelete={() => confirmDelete(selected)}
        />
      )}

      {screen === 'form' && (
        <FormScreen
          key={editing ? editing.id : 'new'}
          existing={editing}
          onBack={() => setScreen(editing ? 'detail' : 'home')}
          onSave={saveProduct}
        />
      )}

      {screen === 'home' && (
        <View style={{ flex: 1 }}>
          <FlatList
            data={products}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <ProductRow item={item} onPress={openProduct} />}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            refreshing={loading}
            onRefresh={loadProducts}
            ListHeaderComponent={
              <View>
                <Text style={styles.title}>Discover</Text>
                <Text style={styles.subtitle}>
                  {query ? `Results for "${query}"` : category ? `Browsing ${category}` : 'All products'}
                </Text>

                <View style={styles.searchWrap}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search products..."
                    placeholderTextColor={C.muted}
                    value={searchText}
                    onChangeText={setSearchText}
                    onSubmitEditing={submitSearch}
                    returnKeyType="search"
                  />
                  {(searchText || query) ? (
                    <Pressable onPress={clearSearch}><Text style={styles.clear}>✕</Text></Pressable>
                  ) : null}
                  <Pressable onPress={submitSearch} style={styles.goBtn}><Text style={styles.goText}>Go</Text></Pressable>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
                  {[null, ...categories].map((c) => {
                    const active = c === category && !query;
                    return (
                      <Pressable key={c ?? 'all'} onPress={() => pickCategory(c)} style={styles.tab}>
                        <Text style={[styles.tabText, active && styles.tabTextActive]}>{c ?? 'all'}</Text>
                        {active && <View style={styles.tabLine} />}
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {loading && <ActivityIndicator size="large" color={C.green} style={{ margin: 16 }} />}
                {error && <Text style={styles.error}>{error}</Text>}
                {log ? <Text style={styles.log}>{log}</Text> : null}
              </View>
            }
            ListEmptyComponent={!loading ? <Text style={styles.empty}>Nothing found.</Text> : null}
          />
          <Pressable style={styles.fab} onPress={() => openForm(null)}>
            <Text style={styles.fabText}>＋</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

/* =====================================================================
   STYLES
   ===================================================================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  title: { fontFamily: SERIF, fontSize: 36, color: C.ink, fontWeight: '700' },
  subtitle: { color: C.muted, marginTop: 2, marginBottom: 14 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 30, borderWidth: 1, borderColor: C.line, paddingLeft: 16, paddingRight: 6 },
  searchInput: { flex: 1, paddingVertical: 10, color: C.ink },
  clear: { color: C.muted, paddingHorizontal: 8, fontSize: 16 },
  goBtn: { backgroundColor: C.green, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  goText: { color: '#fff', fontWeight: '700' },
  tab: { marginRight: 20, alignItems: 'center' },
  tabText: { color: C.muted, fontSize: 15, paddingBottom: 4 },
  tabTextActive: { color: C.ink, fontWeight: '700' },
  tabLine: { height: 3, width: '100%', backgroundColor: C.green, borderRadius: 2 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 18, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: C.line },
  thumb: { width: 92, height: 92, borderRadius: 14, marginRight: 14, backgroundColor: C.soft },
  rowCat: { fontSize: 10, letterSpacing: 1.2, color: C.green, fontWeight: '700' },
  rowTitle: { fontFamily: SERIF, fontSize: 16, color: C.ink, marginVertical: 2 },
  rowPrice: { fontSize: 16, fontWeight: '700', color: C.ink },
  off: { color: C.green, backgroundColor: C.soft, fontSize: 11, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, marginLeft: 8, overflow: 'hidden' },
  inline: { flexDirection: 'row', alignItems: 'center' },
  muted: { color: C.muted, fontSize: 12, marginTop: 2 },
  localTag: { marginTop: 4, alignSelf: 'flex-start', color: C.green, fontSize: 11, fontStyle: 'italic' },
  chev: { fontSize: 26, color: C.muted, marginLeft: 6 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
  counter: { position: 'absolute', right: 14, bottom: 34, backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, fontSize: 12, overflow: 'hidden' },
  floatBack: { position: 'absolute', top: 14, left: 14, width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 3 },
  floatBackText: { fontSize: 28, lineHeight: 30, color: C.ink },
  sheet: { backgroundColor: C.bg, marginTop: -24, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  detailTitle: { fontFamily: SERIF, fontSize: 26, color: C.ink, fontWeight: '700', marginTop: 2 },
  bigPrice: { fontSize: 26, fontWeight: '800', color: C.green },
  strike: { color: C.muted, textDecorationLine: 'line-through', marginLeft: 10 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tag: { borderWidth: 1, borderColor: C.line, color: C.muted, fontSize: 12, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, backgroundColor: C.card },
  sectionTitle: { fontFamily: SERIF, fontSize: 19, color: C.ink, fontWeight: '700', marginTop: 24, marginBottom: 8 },
  body: { color: '#44413b', lineHeight: 21 },
  infoRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line },
  infoKey: { width: '42%', color: C.muted, fontSize: 13 },
  infoVal: { flex: 1, color: C.ink, fontSize: 13 },
  review: { backgroundColor: C.card, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: C.line },
  reviewName: { fontWeight: '700', color: C.ink },
  actions: { position: 'absolute', left: 16, right: 16, bottom: 16, flexDirection: 'row', gap: 12, justifyContent: 'center' },
  pill: { flex: 1, paddingVertical: 14, borderRadius: 30, alignItems: 'center', elevation: 4 },
  pillGhost: { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.green },
  pillText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  formTop: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line },
  formHeading: { fontFamily: SERIF, fontSize: 24, fontWeight: '700', color: C.ink },
  label: { fontSize: 11, letterSpacing: 1.2, color: C.muted, marginTop: 18, marginBottom: 6, fontWeight: '700' },
  field: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, color: C.ink },
  error: { color: C.danger, marginTop: 14 },
  log: { color: C.muted, fontSize: 11, marginBottom: 10, fontStyle: 'italic' },
  empty: { textAlign: 'center', color: C.muted, marginTop: 30 },
});