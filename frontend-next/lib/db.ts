'use client'

const DB_NAME = 'vitalscan'
const DB_VERSION = 1
const STORE = 'files'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      ;(e.target as IDBOpenDBRequest).result.createObjectStore(STORE)
    }
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result)
    req.onerror = reject
  })
}

export async function storeFile(file: File): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(file, 'pending')
    tx.oncomplete = () => resolve()
    tx.onerror = reject
  })
}

export async function retrieveFile(): Promise<File | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).get('pending')
    req.onsuccess = () => {
      tx.objectStore(STORE).delete('pending')
      resolve((req.result as File) ?? null)
    }
    req.onerror = reject
  })
}
