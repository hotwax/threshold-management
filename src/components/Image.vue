<template>
  <img :src="imageUrl"/>
</template>

<script setup lang="ts">
import { defineProps, onMounted, onUpdated, ref } from 'vue';
import defaultImage from "../assets/images/defaultImage.png";

declare let process: any;

const props = defineProps(['src']);
let imageUrl = ref(defaultImage);
let resourceUrl = process.env.VUE_APP_RESOURCE_URL || "";

const setImageUrl = () => {
  if (props.src) {
    if (props.src.startsWith('http')) {
      // If starts with http, it is web url check for existence and assign
      checkIfImageExists(props.src).then(() => {
        imageUrl.value = props.src;
      }).catch(() => {
        console.error("Image doesn't exist");
      })
    } else if (props.src.indexOf('assets/') != -1 || props.src.startsWith('/img/')) {
      // Assign directly in case of assets or if image starts with /img/ (when url start with /img/ then the img is the local asset url of the app)
      imageUrl.value = props.src;
    } else {
      // Image is from resource server, hence append to base resource url, check for existence and assign
      const newImageUrl = resourceUrl.concat(props.src)
      checkIfImageExists(imageUrl.value).then(() => {
        imageUrl.value = newImageUrl;
      }).catch(() => {
        console.error("Image doesn't exist");
      })
    }
  }
}

const checkIfImageExists = (src: string) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => reject(false);
    img.src = src;
  })
}

onMounted(() => {
  setImageUrl();
})

onUpdated(() => {
  setImageUrl();
});
</script>
