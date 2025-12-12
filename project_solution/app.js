const choosePhotoInput = document.querySelector(".choose-photo input");
const choosePhotoContainer = document.querySelector(".choose-photo header");
const actionContainer = document.querySelector(".choose-photo .actions");

const retakeAction = actionContainer.querySelector("#retake-photo");
const processAction = actionContainer.querySelector("#process-photo");

let photoBase64 = undefined;

function handleChoosePhotoClick(event) {
  if (!choosePhotoInput) {
    return;
  }
  choosePhotoInput.click();
}

choosePhotoContainer.addEventListener("click", handleChoosePhotoClick);
retakeAction.addEventListener("click", handleChoosePhotoClick);

function handlePhotoUpload(event) {
  const file = choosePhotoInput.files[0];
  if (!file) {
    return;
  }

  const allowedTypes = ["image/png", "image/jpeg"];
  if (!allowedTypes.includes(file.type)) {
    alert("Please upload a PNG or JPEG image.");
    choosePhotoInput.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    const dataUrl = e.target.result;
    const base64 = dataUrl.split(",")[1];
    photoBase64 = dataUrl;

    choosePhotoContainer.style.display = "none";
    actionContainer.classList.remove("display-none");

    const choosePhotoContainerParent = choosePhotoContainer.parentElement;
    let imgTag = choosePhotoContainerParent.querySelector("img.photo-preview");
    if (!imgTag) {
      imgTag = document.createElement("img");
      imgTag.classList.add("photo-preview");
    }
    imgTag.src = dataUrl;

    choosePhotoContainer.insertAdjacentElement("afterend", imgTag);
  };

  reader.readAsDataURL(file);
}

choosePhotoInput.addEventListener("change", handlePhotoUpload);

function addLoadingElement(parentElement) {
  const imgTag = document.createElement("img");
  imgTag.src = "./assets/bin.svg";
  imgTag.alt = "Bin";
  const headingTag = document.createElement("h3");
  headingTag.classList.add("heading");
  headingTag.innerText = "Loading...";
  const loader = document.createElement("div");
  loader.classList.add("loader");
  loader.insertAdjacentElement("beforeend", imgTag);
  loader.insertAdjacentElement("beforeend", headingTag);
  parentElement.insertAdjacentElement("beforeend", loader);
}

function removeLoadingElement(parentElement) {
  const loader = parentElement.querySelector(".loader");
  if (!loader) {
    return;
  }
  parentElement.removeChild(loader);
}

function createIdentifiedItemCard(itemName) {
  const card = document.createElement("div");
  card.className = "card display-center secondary";

  const header = document.createElement("header");
  header.className = "header-center";

  const p = document.createElement("p");
  p.className = "heading";
  p.innerHTML = `Identified Item: <strong>${itemName}</strong>`;

  header.appendChild(p);
  card.appendChild(header);

  return card;
}

function createClassifiedBinsCard(bins, color) {
  const card = document.createElement("div");
  card.className = "card secondary";

  const header = document.createElement("header");
  const h3 = document.createElement("h3");
  h3.className = "heading";
  h3.textContent = "Throw in any of these bins:";
  header.appendChild(h3);

  const classifiedBins = document.createElement("div");
  classifiedBins.className = "classified-bins";

  bins.forEach((bin) => {
    const wrapper = document.createElement("div");
    wrapper.className = "image-wrapper";

    const img = document.createElement("img");
    img.className = "bin-image";
    img.src = `./assets/trash-bin-${color}.svg`;
    img.alt = "Bin";

    const title = document.createElement("h3");
    title.textContent = bin;

    const check = document.createElement("img");
    check.className = "checked-image";
    check.src = "./assets/checked.svg";
    check.alt = "Checked";

    wrapper.appendChild(img);
    wrapper.appendChild(title);
    wrapper.appendChild(check);

    classifiedBins.appendChild(wrapper);
  });

  card.appendChild(header);
  card.appendChild(classifiedBins);

  return card;
}

function createDidYouKnowCard(text) {
  const card = document.createElement("div");
  card.className = "card active";

  const header = document.createElement("header");
  header.className = "header-center";

  const h3 = document.createElement("h3");
  h3.className = "heading";
  h3.textContent = "Did you know?";

  header.appendChild(h3);

  const p = document.createElement("p");
  p.className = "margin-top-small description text-center";
  p.textContent = text;

  card.appendChild(header);
  card.appendChild(p);

  return card;
}

const COLOR_MAP = {
  recycle: "blue",
  organic: "green",
  "non-recycle": "red",
  hazardous: "yellow",
};

function cleanupPlayground(playgroundContainerElement) {
  const cards = playgroundContainerElement.getElementsByClassName("card");
  for (let i = cards.length - 1; i >= 0; i--) {
    const card = cards[i];
    if (!card.classList.contains("choose-photo")) {
      playgroundContainerElement.removeChild(card);
    }
  }
}

function processResult(result) {
  const playgroundCardContainer = document.querySelector(
    "#playground .card-container"
  );

  cleanupPlayground(playgroundCardContainer);

  const identificationCard = createIdentifiedItemCard(result.name);
  const bins = [result.tri_sort, result.common_sort, result.color_sort];
  const color = COLOR_MAP[result.color_sort.toLowerCase()];
  const binCard = createClassifiedBinsCard(bins, color);
  const didYouKnowCard = createDidYouKnowCard(result.fun_fact);

  playgroundCardContainer.insertAdjacentElement(
    "beforeend",
    identificationCard
  );
  playgroundCardContainer.insertAdjacentElement("beforeend", binCard);
  playgroundCardContainer.insertAdjacentElement("beforeend", didYouKnowCard);
}

async function handleProcessImage(event) {
  const parent = event.target.parentElement;
  addLoadingElement(parent);
  console.log(photoBase64);

  const playgroundCardContainer = document.querySelector(
    "#playground .card-container"
  );

  cleanupPlayground(playgroundCardContainer);
  
  try {
    const response = await fetch(
      "https://78pi2wk1zg.execute-api.ap-southeast-2.amazonaws.com/classify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_base64: photoBase64,
          prompt: `
            You are an image waste-classification assistant.

            You will be given a photo. Your job is to:
            1. Identify the item in the photo.
            2. Classify it using these systems:

            TRI-SORT SYSTEM: Wet, Dry, Electronic
            COMMON-SORT SYSTEM: Metal, Paper, Plastic, Glass, General Waste
            COLOR-CODED SYSTEM: Organic, Recycle, Non-Recycle, Hazardous

            Pick exactly ONE option from each of the three systems.

            You MUST follow these rules for the OUTPUT:

            - Respond with ONLY a single JSON object and NOTHING else.
            - The JSON MUST be valid for JSON.parse in JavaScript.
            - Do NOT wrap the JSON in backticks or a code block.
            - Do NOT add comments, explanations, or extra keys.
            - All keys and string values MUST use double quotes.
            - Do NOT include trailing commas.

            If you can identify the item, the JSON MUST have this exact shape:

            {
              "name": "<name of the item>",
              "tri_sort": "<Wet or Dry or Electronic>",
              "common_sort": "<Metal or Paper or Plastic or Glass or General Waste>",
              "color_sort": "<Organic or Recycle or Non-Recycle or Hazardous>",
              "fun_fact": "<1 paragraph fun fact about this type of waste>"
            }

            If you CANNOT identify the item for any reason, respond with EXACTLY:

            {"error": true}
          `,
        }),
      }
    );
    const data = await response.json();

    console.log({ data });
    const result = data.result;
    if (!result) {
      alert("Failed to process the image. Try again!");
    }

    try {
      const resultData = JSON.parse(result);
      if (resultData.error) {
        alert("Server failed to identify the image. Please try again with different image!")
      } else{
        processResult(resultData);
      }
    } catch (err) {
      console.error(err);
      alert(`Failed to process the image. Try again! ${err}`);
    }
  } catch (err) {
    console.error(err);
    alert(
      "Failed to process image. Error occured while calling the server. Try Again!"
    );
  }
  removeLoadingElement(parent);
}

processAction.addEventListener("click", handleProcessImage);


