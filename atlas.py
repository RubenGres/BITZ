import os

from llama_index.core.schema import BaseNode, TextNode

# os.environ["HF_HOME"]="/mnt/common/hdd/home/PVoitot/.cache/huggingface"
os.environ["HF_HOME"] = "/mnt/common/hdd/huggingface"
os.environ["LLAMA_INDEX_CACHE_DIR"] = "/mnt/common/hdd/llama_index"
# os.environ["PROJ_LIB"]="/var/data/shared_envs/anaconda3/envs/dchan_odeon_v2/lib/python3.10/site-packages/rasterio/proj_data"
# os.environ["PROJ_DATA"]="/var/data/shared_envs/anaconda3/envs/dchan_odeon_v2/lib/python3.10/site-packages/rasterio/proj_data"
os.environ["TORCH_HOME"]="/mnt/common/hdd/home/PVoitot/.cache/"
os.environ['HTTP_PROXY']="http://proxy.ign.fr:3128"
os.environ['HTTPS_PROXY']="http://proxy.ign.fr:3128"
os.environ["WEAVIATE_URL"] = "http://smlpinfdaiap1"
os.environ["NO_PROXY"] = "localhost,127.0.0.1,ign.fr"
os.environ["OLLAMA_HOST"] = "http://DEL2212S017.ign.fr:11434"

from typing import Dict, Any, List
from json import JSONDecodeError

from pathlib import Path
from llama_index.embeddings.ollama import OllamaEmbedding
from llama_index.llms.ollama import Ollama
import ollama

from llama_index.core import (
    VectorStoreIndex,
    Document,
    SimpleDirectoryReader,
    StorageContext,
    load_index_from_storage
)

from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core import Settings, Document
from llama_index.core.response_synthesizers import ResponseMode

from llmsherpa.readers import LayoutPDFReader, Section

import json
import copy
from tqdm import tqdm
import math
import time

import gradio as gr
import time
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from sklearn.decomposition import PCA

from gradio_pdf import PDF

import plotly.offline as pyo
import plotly.graph_objs as go
import logging
import sys

logging.basicConfig(stream=sys.stdout, level=logging.DEBUG)

logger = logging.getLogger(__name__)

CHUNK_SIZE = 512
OVERLAP=64

def parse_pdf_doc(pdf_path: str, llmsherpa_api_url: str):
    pdf_reader = LayoutPDFReader(llmsherpa_api_url)
    doc = pdf_reader.read_pdf(pdf_path)
    return doc

# def build_index_from_doc(doc):
#     index = VectorStoreIndex([])
#     for chunk in doc.sections():
#         text = chunk.to_text(include_children=True)
#         s = text.strip().split()
#         print(len(s))
#         if len(text) < 100:
#             continue
#         print(text)
#         print("----")
#         index.insert(Document(text=text, extra_info={}))
#     return index
    
def build_index(pdf_path: str):
    paths = [
        pdf_path
    ]
    documents = SimpleDirectoryReader(input_files=paths).load_data()

    index = VectorStoreIndex.from_documents(documents)
    return index

# def split_section_to_text(section, chunk_size=CHUNK_SIZE):
#     sub_sections_as_text = []

#     section_text = ''
#     for child in section.children:
#         child_text = child.to_text(include_children=True, recurse=True)

#         # recursively split section if it is too large, otherwise append it to the current section
#         if isinstance(child, Section):
#             if section_text:
#                 sub_sections_as_text.append(section.parent_text() + "\n" + section.title + "\n" + section_text)
#                 section_text = ''

#             if len(child_text) > chunk_size:
#                 sub_sections_as_text.extend(split_section_to_text(child, chunk_size))
#             else:
#                 sub_sections_as_text.append(child.parent_text() + "\n" + child_text)
#         else:
#             # group together paragraghs, tables, etc., everything that is not a section
#             section_text += ("\n" if section_text else '') + child_text

#     if section_text:
#         sub_sections_as_text.append(section.parent_text() + "\n" + section.title + "\n" + section_text)
            
#     return sub_sections_as_text


# def split_document_to_text(doc, chunk_size=CHUNK_SIZE, first_n_chunks=None):
#     """ Splits a document into chunks of text, where chunks are ideally sections of the document. 
#     If a section is too large, it is recursively split into smaller subsections.
#     The split algorithm attempts to preserve the section-level structure of the document as much as possible, to maintain the local context of the information present in the document.
#     """
#     chunks = []
#     main_sections = [section for section in doc.sections() if section.level == 0]
#     [chunks.extend(split_section_to_text(section, chunk_size=chunk_size)) for section in main_sections]

#     if first_n_chunks and first_n_chunks < len(chunks):
#         chunks = chunks[:first_n_chunks+1]

#     return chunks


from llama_index.core import VectorStoreIndex, get_response_synthesizer
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core import PromptTemplate
from llama_index.retrievers.bm25 import BM25Retriever
from llama_index.core.retrievers import QueryFusionRetriever
from llama_index.core.retrievers.fusion_retriever import FUSION_MODES
from llama_index.core.prompts.prompt_type import PromptType
from llama_index.core.prompts.base import PromptTemplate
from llama_index.core.prompts import SelectorPromptTemplate
from llama_index.core.base.llms.types import ChatMessage, MessageRole
from llama_index.core.prompts.base import ChatPromptTemplate
from llama_index.core.prompts.utils import is_chat_model

# from llama_index.core.chat_engine.context import CondensePlusContextChatEngine 
from llama_index.core.chat_engine.condense_question import CondenseQuestionChatEngine


# text qa prompt
TEXT_QA_SYSTEM_PROMPT = ChatMessage(
    content=(
        # "You are an expert Q&A system that is trusted around the world.\n"
        # "Always answer the query using the provided context information, "
        # "and not prior knowledge.\n"
        # "Some rules to follow:\n"
        # "1. Never directly reference the given context in your answer.\n"
        # "2. Avoid statements like 'Based on the context, ...' or "
        # "'The context information ...' or anything along "
        # "those lines."
        "Tu es un système expert Question/Réponse reconnu.\n"
        "Réponds toujours à la question en utilisant le contexte fourni, "
        "et aucune autre information.\n"
        "Quelques règles à suivre:\n"
        "1. Ne référence jamais le contexte fourni dans ta réponse.\n"
        "2. Evite les phrases de type \"D'après le contexte, ...\" ou \"Le contexte ...\" ou du genre \"ces lignes.\""
    ),
    role=MessageRole.SYSTEM,
)


DEFAULT_TEXT_QA_PROMPT_TMPL = (
    "Le contexte est ci-dessous.\n"
    "---------------------\n"
    "{context_str}\n"
    "---------------------\n"
    "Etant donné ce contexte et aucune autre information, "
    "Réponds à la question.\n"
    "Question: {query_str}\n"
    "Réponse: "
)


QUERY_GEN_PROMPT_FR = """\
"""

DEFAULT_TEMPLATE_FR = """\
Etant donné une conversation (entre un humain et un assistant) et un nouveau message venant de l'humain, \
Réécris ce message pour en faire une question autonome qui capture le contexte pertinent \
des échanges précédents en favorisant les échanges récents.
Ne réponds rien d'autre que la question autonome.

<Historique de la Conversation>
{chat_history}

<Nouveau Message>
{question}

<Question Autonome>
"""

TEXT_QA_PROMPT_TMPL_MSGS = [
    TEXT_QA_SYSTEM_PROMPT,
    ChatMessage(
        content=DEFAULT_TEXT_QA_PROMPT_TMPL,
        role=MessageRole.USER,
    ),
]

CHAT_TEXT_QA_PROMPT = ChatPromptTemplate(message_templates=TEXT_QA_PROMPT_TMPL_MSGS)


DEFAULT_TEXT_QA_PROMPT = PromptTemplate(
    DEFAULT_TEXT_QA_PROMPT_TMPL, prompt_type=PromptType.QUESTION_ANSWER
)
default_text_qa_conditionals = [(is_chat_model, CHAT_TEXT_QA_PROMPT)]

DEFAULT_TEXT_QA_PROMPT_SEL = SelectorPromptTemplate(
    default_template=DEFAULT_TEXT_QA_PROMPT,
    conditionals=default_text_qa_conditionals, # type: ignore
)

TOP_K = 10


DEFAULT_PROMPT_FR = PromptTemplate(DEFAULT_TEMPLATE_FR)


def reformater_texte(texte, max_caracteres):
    # On divise le texte par les lignes existantes
    lignes = texte.splitlines()
    texte_reformate = []
    
    # Parcourir chaque ligne déjà présente
    for ligne in lignes:
        mots = ligne.split()  # Diviser chaque ligne en mots
        ligne_reformatee = []
        longueur_ligne = 0
        
        for mot in mots:
            # Si l'ajout du mot dépasse la limite, on ajoute une nouvelle ligne
            if longueur_ligne + len(mot) + len(ligne_reformatee) > max_caracteres:
                texte_reformate.append(" ".join(ligne_reformatee))
                ligne_reformatee = [mot]
                longueur_ligne = len(mot)
            else:
                ligne_reformatee.append(mot)
                longueur_ligne += len(mot)
        
        # Ajouter la dernière ligne reformattée
        if ligne_reformatee:
            texte_reformate.append(" ".join(ligne_reformatee))
    
    return "\n".join(texte_reformate)


def plot_default(all_nodes: List[BaseNode]):
    embs = []
    sentences = []
    hovertmpls = []
    
    for i, n in enumerate(all_nodes):
        if isinstance(n, TextNode) and n.text is not None:
            embs.append(n.embedding)
            hovertmpls.append('%{customdata}<extra></extra>')
            t = reformater_texte(n.text.replace("\n", " "), 100)
            t = t.replace("\n", "<BR>")
            sentences.append(t)

    embs1 = np.array(embs)
    pca = PCA(n_components=3)  # Using 3 components for 3D scatter
    reduced_embeddings = pca.fit_transform(embs1)

    # Create 3D scatter plot
    # fig = px.scatter_3d(
    fig = go.Figure()
    fig.add_trace(go.Scatter3d(
        x=reduced_embeddings[:, 0],
        y=reduced_embeddings[:, 1],
        z=reduced_embeddings[:, 2],
        mode="markers",
        customdata=sentences,
        hovertemplate=hovertmpls, #('%{customdata}<extra></extra>'),
    ))

    colors = ['rgba(0,0,255,0.25)'] * len(reduced_embeddings)
    sizes = [10] * len(reduced_embeddings)
    fig.update_traces(marker=dict(color=colors, size=sizes))

    fig.update_layout(
        scene=dict(
            aspectmode='data',  # Ensures equal scaling for x, y, and z axes
            xaxis=dict(nticks=4, rangemode='normal', showgrid = True, showticklabels=False), #, backgroundcolor='rgba(0,0,0,0)', showticklabels=False),
            yaxis=dict(nticks=4, rangemode='normal', showgrid = True, showticklabels=False), #, backgroundcolor='rgba(0,0,0,0)', showticklabels=False),
            zaxis=dict(nticks=4, rangemode='normal', showgrid = True, showticklabels=False), #, backgroundcolor='rgba(0,0,0,0)', showticklabels=False),
        ),
        paper_bgcolor='rgba(255,255,255,1)',
        plot_bgcolor='rgba(0,0,0,0)',    # Removes the background inside the plot area
        showlegend=False,  # Removes the legend
        height=440
    )
    return fig

def plot_pca(chat_engine, embed, all_nodes, message, chat_history):
    print("msg", message)
    # qs = query_engine.query(message)
    # print("query", qs, qs.source_nodes)
    response = chat_engine.chat(message)
    # q = chat_engine._condense_question(chat_history, message)
    # print("q", q)
    q = response.sources[0].raw_input["query"]
    # q = response.sources[0].raw_input["message"]
    # q = message
    print("q", q)
    # nodes = retriever.retrieve(q)
    nodes = response.source_nodes
    # print("nodes", nodes)
    for n in nodes:
        print(n.id_, n.score, n.text.replace("\n", " "))
        print("---------------------------")
    resp = str(response)

    # print("RESP", chat_engine.chat(message))
    
    ids = []
    for nws in nodes:
        n = nws.node
        ids.append(n.id_)

    embs = []
    sentences = []
    closest_indices = []
    hovertmpls = []
    for i, n in enumerate(all_nodes):
        if isinstance(n, TextNode) and n.text is not None:
            embs.append(n.embedding)
            if n.id_ in ids: # type: ignore
                closest_indices.append(i)
                hovertmpls.append('%{customdata}<extra></extra>')
                t = reformater_texte(n.text.replace("\n", " "), 100)
                t = t.replace("\n", "<BR>")
            else:
                t = ""
                hovertmpls.append(None)
            sentences.append(t)
    sentences.append(q)
    hovertmpls.append('%{customdata}<extra></extra>')
    qe = embed.get_query_embedding(q)
    embs0 = np.array(embs)
    embs1 = np.vstack([embs0, qe])
  # embeddings_1 = [np.random.rand(1024) for _ in range(100)]
  # new_embedding = np.random.rand(1024)

  # Assuming you have 100 sentences + 1 for the new_embedding
      # sentences = [f"Sentence {i}" for i in range(100)] + ["New Sentence"]
    
    # # Find the new point (last point in reduced_embeddings)
    # new_point = embs1[-1]

    # # Compute Euclidean distances from the new point to all other points
    # distances = np.linalg.norm(embs1 - new_point)
    
    # # np.sqrt(
    # #     (reduced_embeddings[:, 0] - new_point[0]) ** 2 +
    # #     (reduced_embeddings[:, 1] - new_point[1]) ** 2 +
    # #     (reduced_embeddings[:, 2] - new_point[2]) ** 2
    # # )
    # # Get indices of the 5 closest points (excluding the new point itself)
    # nb_nearest = 5
    # closest_indices = np.argsort(distances)[1:(1+nb_nearest)]
    # print("inds", distances, closest_indices)
    
    # PCA to reduce dimensions
    pca = PCA(n_components=3)  # Using 3 components for 3D scatter
    
    reduced_embeddings = pca.fit_transform(embs1)
    # reduced_embeddings = (reduced_embeddings - np.mean(reduced_embeddings, axis=0)) / np.std(reduced_embeddings, axis=0) 


    # Create 3D scatter plot
    # fig = px.scatter_3d(
    fig = go.Figure()
    fig.add_trace(go.Scatter3d(
        x=reduced_embeddings[:, 0],
        y=reduced_embeddings[:, 1],
        z=reduced_embeddings[:, 2],
        mode="markers",
        # hover_name=sentences,
        # hoverinfo = hoverinfos,
        customdata=sentences,
        hovertemplate=hovertmpls, #('%{customdata}<extra></extra>'),
    ))

    fig.update_traces(marker=dict(size=5))

    # # Find the new point (last point in reduced_embeddings)
    reduced_new_point = reduced_embeddings[-1]

    # # Compute Euclidean distances from the new point to all other points
    # distances = np.sqrt(
    #     (reduced_embeddings[:, 0] - new_point[0]) ** 2 +
    #     (reduced_embeddings[:, 1] - new_point[1]) ** 2 +
    #     (reduced_embeddings[:, 2] - new_point[2]) ** 2
    # )
    # # Get indices of the 5 closest points (excluding the new point itself)
    # closest_indices = np.argsort(distances)[1:6]

    # Draw lines from the new point to each of the 5 closest points
    for idx in closest_indices:
        fig.add_trace(go.Scatter3d(
            x=[reduced_new_point[0], reduced_embeddings[idx, 0]],
            y=[reduced_new_point[1], reduced_embeddings[idx, 1]],
            z=[reduced_new_point[2], reduced_embeddings[idx, 2]],
            mode='lines',
            line=dict(color='red', width=2),
        ))

    # Highlight the new point and closest points
    colors = ['rgba(0,0,255,0.25)'] * len(reduced_embeddings)
    colors[-1] = 'red'  # Color the new point red
    sizes = [10] * len(reduced_embeddings)
    sizes[-1] = 24
    for i, idx in enumerate(closest_indices):
        colors[idx] = 'green'  # Color the 5 closest points green
        sizes[idx] = int(12 * (1.0 + 2.0 * (len(closest_indices) - i) / len(closest_indices)))

    inds = [-1] + closest_indices
    xmax = reduced_embeddings[inds, 0].max()
    xmin = reduced_embeddings[inds, 0].min()
    ymax = reduced_embeddings[inds, 1].max()
    ymin = reduced_embeddings[inds, 1].min()
    zmax = reduced_embeddings[inds, 2].max()
    zmin = reduced_embeddings[inds, 2].min()

    Xmax = reduced_embeddings[:, 0].max()
    Xmin = reduced_embeddings[:, 0].min()
    Ymax = reduced_embeddings[:, 1].max()
    Ymin = reduced_embeddings[:, 1].min()
    Zmax = reduced_embeddings[:, 2].max()
    Zmin = reduced_embeddings[:, 2].min()
    
    x_range = Xmax - Xmin
    y_range = Ymax - Ymin
    z_range = Zmax - Zmin

    x_window_size = xmax - xmin
    y_window_size = ymax - ymin
    z_window_size = zmax - zmin

    # x_zoom_scale = x_range / x_window_size
    # y_zoom_scale = y_range / y_window_size
    # z_zoom_scale = z_range / z_window_size

    center_x = (xmin + xmax) / 2
    center_y = (ymin + ymax) / 2
    center_z = (zmin + zmax) / 2
    
    # Update scatter points colors in 3D
    fig.update_traces(marker=dict(color=colors, size=sizes))

    # Enforce equal axis scaling for the 3D plot
    # camera = dict(
    #     up=dict(x=0, y=0, z=1),
    #     center=dict(x=0, y=0, z=0),
    #     # eye=dict(x=1.25, y=1.25, z=1.25)
    #     eye=dict(x=reduced_new_point[0], y=reduced_new_point[1], z=reduced_new_point[2])
    # )
    diagonal_length = np.sqrt(x_window_size**2 + y_window_size**2 + z_window_size**2)
    fov = np.pi / 3.0
    camera_distance = diagonal_length / (2 * np.tan(fov / 2))
    scale = 1.2
    camera=dict(
        center=dict(x=center_x / x_range, y=center_y / y_range, z=0) ,#center_z / z_range),  # Keep camera centered at origin
        # eye=dict(x=center_x, y=center_y, z=center_z),  # Zoom to the target area
        eye=dict(x=(center_x + x_window_size) * scale /  x_range, 
                 y=(center_y + y_window_size) * scale /  y_range, 
                 z=0.5) #(center_z + z_window_size) * scale /  z_range),
    )
    fig.update_layout(
        scene=dict(
            camera=camera,
            aspectmode='data',  # Ensures equal scaling for x, y, and z axes
            xaxis=dict(nticks=4, rangemode='normal', showgrid = True, showticklabels=False),
            yaxis=dict(nticks=4, rangemode='normal', showgrid = True, showticklabels=False),
            zaxis=dict(nticks=4, rangemode='normal', showgrid = True, showticklabels=False),
        ),
        # scene_camera=camera,
        # paper_bgcolor='rgba(255,255,255,1)',
        # plot_bgcolor='rgba(0,0,0,0)',    # Removes the background inside the plot area
        showlegend=False,  # Removes the legend
        height=440
    )

    # fig.update_xaxes(range=[xmin, xmax])
    # fig.update_yaxes(range=[ymin, ymax])
    # Extract sentences of the 5 closest points
    closest_sentences = [sentences[i] for i in closest_indices]

    chat_history.append({"role": "user", "content": message})
    chat_history.append({"role": "assistant", "content": resp})
    return fig, "", chat_history

import gradio as gr


def main():
    models = [
        "llama3.2:3b",
        "llama3.1:8b",
        "llama3.1:70b"
    ]

    OLLAMA_LLM_MODEL = "llama3.2:3b"
    # OLLAMA_LLM_MODEL = "llama3.1:8b"
    # OLLAMA_LLM_MODEL = "llama3.1:70b"

    llm = Ollama(
        model=OLLAMA_LLM_MODEL,
        base_url="http://DEL2212S017.ign.fr:11434",
        request_timeout=120.0
    )

    embed = OllamaEmbedding(
        model_name="mxbai-embed-large:latest",
        # model_name="bge-m3:latest",
        base_url="http://DEL2212S017.ign.fr:11434",
        # ollama_additional_kwargs={"mirostat": 0},
    )


    # LLM_SHERPA_URL = "http://infradai01.ign.fr:5010/api/parseDocument?renderFormat=all&applyOcr=no"

    Settings.text_splitter = SentenceSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=OVERLAP)
    Settings.embed_model = embed
    Settings.llm = llm

    pdf_path = "/mnt/stores/store-DAI/pocs/LLM/demos/AC240023-ATLAS-3-Complet-pages-BD.pdf"
    chat_engine: CondenseQuestionChatEngine | None = None
    all_nodes : List[BaseNode] = []

    def init_index():
        index = build_index(pdf_path)

        index.insert(Document(
        text=f"""nom du fichier: AC240023-ATLAS-3-Complet-pages-BD.pdf
    titre du document: Atlas IGN, Cartographier l'anthropocène, à l'ère de l'intelligence artificielle
    """, extra_info={}))
        
        logger.info(f"index built from {pdf_path}")

        all_nodes = list(index.docstore.docs.values())
        for i, node in enumerate(all_nodes):
            ne = index._get_node_with_embedding([node])[0]
            all_nodes[i] = ne


        logger.info(f"First Node {all_nodes[0]}")
        
        retriever = VectorIndexRetriever(
            index=index,
            similarity_top_k=TOP_K,
        )

        # configure response synthesizer
        response_synthesizer = get_response_synthesizer(
            # response_mode="tree_summarize",
            response_mode=ResponseMode.COMPACT,
            text_qa_template=DEFAULT_TEXT_QA_PROMPT_SEL
        )

        bm25 = BM25Retriever.from_defaults(
            docstore=index.docstore, similarity_top_k=5
        )

        fusion_retriever = QueryFusionRetriever(
            [
                retriever,
                bm25
            ],
            num_queries=1,
            similarity_top_k=TOP_K,
            mode=FUSION_MODES.DIST_BASED_SCORE,
            retriever_weights=[0.5, 0.5]
            # use_async=True,
        )

        # assemble query engine
        query_engine = RetrieverQueryEngine(
            retriever=fusion_retriever,
            response_synthesizer=response_synthesizer,
        )

        chat_engine = CondenseQuestionChatEngine.from_defaults(
            query_engine = query_engine,
            condense_question_prompt=DEFAULT_PROMPT_FR
        )

        return chat_engine, all_nodes
        
    
    chat_engine, all_nodes = init_index()

    # Gradio Interface
    with gr.Blocks(fill_width=True) as demo:
        state = gr.State((chat_engine, all_nodes))
        with gr.Row():
            with gr.Column():
                gr.Markdown("# Recherche par IA dans l'Atlas IGN")
            with gr.Column():
                model_sel = gr.Dropdown(
                    models, show_label=False
                )

        with gr.Row():
            with gr.Column(scale=9):
                PDF(label="Atlas", value=pdf_path)
            with gr.Column(scale=11):  # The plot on the left, take more space
                with gr.Row():
                    with gr.Column(scale=9):
                        msg = gr.Textbox(label="Votre Question")
                    with gr.Column(scale=1):
                        clear = gr.Button("Réinitialiser le Chat")
                chatbot = gr.Chatbot(type="messages")
                plot_output = gr.Plot(plot_default(all_nodes))

        def fn(message, chat_history, state):
            chat_engine, all_nodes = state
            return plot_pca(chat_engine, embed, all_nodes, message, chat_history)
        
        msg.submit(fn, [msg, chatbot, state], [plot_output, msg, chatbot])

        def model_select(model):
            OLLAMA_LLM_MODEL = model
            llm = Ollama(
                model=OLLAMA_LLM_MODEL,
                base_url="http://DEL2212S017.ign.fr:11434",
                request_timeout=120.0
            )
            print(f"Changed Model to {llm}")
            Settings.llm = llm

            chat_engine, all_nodes = init_index()

            return (chat_engine, all_nodes)

        model_sel.select(model_select, inputs=model_sel, outputs=state)

        def clear_chat(msg, history):
            if chat_engine is not None:
                chat_engine.reset()
            return plot_default(all_nodes), "", []
            
        clear.click(clear_chat, inputs=[msg, chatbot], outputs=[plot_output, msg, chatbot])

    # Launch the Gradio interface
    demo.launch(server_name="0.0.0.0")


if __name__ == "__main__":
    main()
